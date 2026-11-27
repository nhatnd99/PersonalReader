/**
 * Hybrid Table of Contents Service (Deterministic Auto Generation + Manual Customization).
 */
import prisma from '../../config/database.js'
import { RealtimeSyncService } from '../../services/sync/realtimeSync.service.js'

/**
 * Deterministically extracts headings (h1-h4) from ordered BookContent chunks.
 * @param {Array<{ sequence: number, contentHtml: string }>} contents
 * @returns {Array<{ title: string, anchorId: string, contentBlockId: string, contentSequence: number, level: number, position: number }>}
 */
export function extractHeadingsFromContents(contents) {
  const entries = []
  const seenAnchors = new Set()

  for (const chunk of contents) {
    const html = chunk.contentHtml || ''
    // Match block-level tags to compute stable block index per chunk
    const blockRegex = /<(h[1-4]|p|ul|ol|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi
    let blockIdx = 0
    let match

    while ((match = blockRegex.exec(html)) !== null) {
      const tag = match[1].toLowerCase()
      const innerHtml = match[2]
      const contentBlockId = `block-s${chunk.sequence}-${blockIdx}`
      blockIdx++

      if (tag.startsWith('h')) {
        const level = parseInt(tag.slice(1), 10)
        const title = innerHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
        if (!title) continue

        const anchorId = `toc-s${chunk.sequence}-b${blockIdx - 1}`
        if (seenAnchors.has(anchorId)) continue
        seenAnchors.add(anchorId)

        entries.push({
          title: title.slice(0, 200),
          anchorId,
          contentBlockId,
          contentSequence: chunk.sequence,
          level: Math.min(4, Math.max(1, level)),
          position: entries.length,
        })
      }
    }
  }

  return entries
}

/**
 * Builds flat DB rows with resolved parentId hierarchy based on heading levels.
 */
async function persistAutoTocEntries(tx, bookId, extractedHeadings) {
  const created = []
  const levelStack = [] // [{ level, id }]

  for (const item of extractedHeadings) {
    while (levelStack.length > 0 && levelStack[levelStack.length - 1].level >= item.level) {
      levelStack.pop()
    }
    const parentId = levelStack.length > 0 ? levelStack[levelStack.length - 1].id : null

    const row = await tx.bookTableOfContents.create({
      data: {
        bookId,
        parentId,
        title: item.title,
        anchorId: item.anchorId,
        contentBlockId: item.contentBlockId,
        contentSequence: item.contentSequence,
        level: item.level,
        position: item.position,
        sourceType: 'AUTO',
      },
    })

    levelStack.push({ level: item.level, id: row.id })
    created.push(row)
  }

  return created
}

export class TocService {
  static async _assertBookOwner(bookId, userId) {
    const book = await prisma.book.findUnique({ where: { id: bookId } })
    if (!book || book.deletedAt !== null) {
      const err = new Error('Book not found')
      err.status = 404
      throw err
    }
    if (book.userId !== userId) {
      const err = new Error('Access denied: You do not own this book')
      err.status = 403
      throw err
    }
    return book
  }

  static async getOrGenerateToc({ bookId, userId }) {
    const book = await this._assertBookOwner(bookId, userId)

    let entries = await prisma.bookTableOfContents.findMany({
      where: { bookId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    })

    if (entries.length === 0) {
      const contents = await prisma.bookContent.findMany({
        where: { bookId },
        orderBy: { sequence: 'asc' },
        select: { sequence: true, contentHtml: true },
      })

      const extracted = extractHeadingsFromContents(contents)
      if (extracted.length > 0) {
        entries = await prisma.$transaction(async (tx) => {
          // Re-check inside transaction to avoid duplicate generation on concurrent opens
          const existingCount = await tx.bookTableOfContents.count({ where: { bookId } })
          if (existingCount > 0) {
            return tx.bookTableOfContents.findMany({
              where: { bookId },
              orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
            })
          }
          return persistAutoTocEntries(tx, bookId, extracted)
        })
      }
    }

    return { entries, tocVersion: book.tocVersion }
  }

  static async createManualEntry({ bookId, userId, title, parentId, contentSequence = 1, contentBlockId, level = 1 }) {
    await this._assertBookOwner(bookId, userId)

    // Validate contentSequence points to an existing BookContent chunk
    const targetChunk = await prisma.bookContent.findUnique({
      where: { bookId_sequence: { bookId, sequence: contentSequence } },
    })
    if (!targetChunk) {
      const err = new Error(`Invalid content location: sequence ${contentSequence} does not exist for this book.`)
      err.status = 400
      throw err
    }

    if (parentId) {
      const parent = await prisma.bookTableOfContents.findUnique({ where: { id: parentId } })
      if (!parent || parent.bookId !== bookId) {
        const err = new Error('Invalid parent TOC entry.')
        err.status = 400
        throw err
      }
    }

    const lastEntry = await prisma.bookTableOfContents.findFirst({
      where: { bookId },
      orderBy: { position: 'desc' },
    })
    const nextPos = lastEntry ? lastEntry.position + 1 : 0
    const anchorId = `toc-manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    const [entry, updatedBook] = await prisma.$transaction([
      prisma.bookTableOfContents.create({
        data: {
          bookId,
          parentId: parentId || null,
          title: title.trim(),
          anchorId,
          contentBlockId: contentBlockId || `block-s${contentSequence}-0`,
          contentSequence,
          level: Math.min(4, Math.max(1, level)),
          position: nextPos,
          sourceType: 'MANUAL',
        },
      }),
      prisma.book.update({
        where: { id: bookId },
        data: { tocVersion: { increment: 1 } },
      }),
    ])

    await RealtimeSyncService.publishBookSyncEvent({
      userId,
      bookId,
      eventName: 'toc:updated',
      payload: { tocVersion: updatedBook.tocVersion },
    })

    return { entry, tocVersion: updatedBook.tocVersion }
  }

  static async updateEntry({ bookId, entryId, userId, title, parentId, contentSequence, contentBlockId, level }) {
    await this._assertBookOwner(bookId, userId)

    const existing = await prisma.bookTableOfContents.findUnique({ where: { id: entryId } })
    if (!existing || existing.bookId !== bookId) {
      const err = new Error('TOC entry not found')
      err.status = 404
      throw err
    }

    if (parentId === entryId) {
      const err = new Error('A TOC entry cannot be its own parent.')
      err.status = 400
      throw err
    }

    if (contentSequence !== undefined) {
      const targetChunk = await prisma.bookContent.findUnique({
        where: { bookId_sequence: { bookId, sequence: contentSequence } },
      })
      if (!targetChunk) {
        const err = new Error(`Invalid content location: sequence ${contentSequence} does not exist.`)
        err.status = 400
        throw err
      }
    }

    const updateData = { sourceType: 'MANUAL' }
    if (title !== undefined) updateData.title = title.trim()
    if (parentId !== undefined) updateData.parentId = parentId || null
    if (contentSequence !== undefined) updateData.contentSequence = contentSequence
    if (contentBlockId !== undefined) updateData.contentBlockId = contentBlockId
    if (level !== undefined) updateData.level = Math.min(4, Math.max(1, level))

    const [entry, updatedBook] = await prisma.$transaction([
      prisma.bookTableOfContents.update({ where: { id: entryId }, data: updateData }),
      prisma.book.update({ where: { id: bookId }, data: { tocVersion: { increment: 1 } } }),
    ])

    await RealtimeSyncService.publishBookSyncEvent({
      userId,
      bookId,
      eventName: 'toc:updated',
      payload: { tocVersion: updatedBook.tocVersion },
    })

    return { entry, tocVersion: updatedBook.tocVersion }
  }

  static async deleteEntry({ bookId, entryId, userId }) {
    await this._assertBookOwner(bookId, userId)

    const existing = await prisma.bookTableOfContents.findUnique({ where: { id: entryId } })
    if (!existing || existing.bookId !== bookId) {
      const err = new Error('TOC entry not found')
      err.status = 404
      throw err
    }

    const [, updatedBook] = await prisma.$transaction([
      prisma.bookTableOfContents.delete({ where: { id: entryId } }),
      prisma.book.update({ where: { id: bookId }, data: { tocVersion: { increment: 1 } } }),
    ])

    await RealtimeSyncService.publishBookSyncEvent({
      userId,
      bookId,
      eventName: 'toc:updated',
      payload: { tocVersion: updatedBook.tocVersion },
    })

    return { message: 'TOC entry deleted', tocVersion: updatedBook.tocVersion }
  }

  static async reorderEntries({ bookId, userId, items }) {
    await this._assertBookOwner(bookId, userId)

    const updatedBook = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.parentId === item.id) continue
        await tx.bookTableOfContents.updateMany({
          where: { id: item.id, bookId },
          data: {
            position: item.position,
            ...(item.parentId !== undefined ? { parentId: item.parentId || null } : {}),
            ...(item.level !== undefined ? { level: Math.min(4, Math.max(1, item.level)) } : {}),
            sourceType: 'MANUAL',
          },
        })
      }

      return tx.book.update({
        where: { id: bookId },
        data: { tocVersion: { increment: 1 } },
      })
    })

    const entries = await prisma.bookTableOfContents.findMany({
      where: { bookId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    })

    await RealtimeSyncService.publishBookSyncEvent({
      userId,
      bookId,
      eventName: 'toc:updated',
      payload: { tocVersion: updatedBook.tocVersion },
    })

    return { entries, tocVersion: updatedBook.tocVersion }
  }

  static async resetToAuto({ bookId, userId }) {
    await this._assertBookOwner(bookId, userId)

    const contents = await prisma.bookContent.findMany({
      where: { bookId },
      orderBy: { sequence: 'asc' },
      select: { sequence: true, contentHtml: true },
    })

    const extracted = extractHeadingsFromContents(contents)

    const { entries, updatedBook } = await prisma.$transaction(async (tx) => {
      await tx.bookTableOfContents.deleteMany({ where: { bookId } })
      const created = extracted.length > 0 ? await persistAutoTocEntries(tx, bookId, extracted) : []
      const book = await tx.book.update({
        where: { id: bookId },
        data: { tocVersion: { increment: 1 } },
      })
      return { entries: created, updatedBook: book }
    })

    await RealtimeSyncService.publishBookSyncEvent({
      userId,
      bookId,
      eventName: 'toc:updated',
      payload: { tocVersion: updatedBook.tocVersion },
    })

    return { entries, tocVersion: updatedBook.tocVersion }
  }
}
