/**
 * Reading Progress & Synchronization State Service.
 */
import prisma from '../../config/database.js'
import { RealtimeSyncService } from '../../services/sync/realtimeSync.service.js'

export class ProgressService {
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

  static async getProgress({ bookId, userId }) {
    await this._assertBookOwner(bookId, userId)

    const progress = await prisma.readingProgress.findUnique({
      where: { userId_bookId: { userId, bookId } },
    })

    return progress || null
  }

  static async upsertProgress({
    bookId,
    userId,
    currentTocEntryId,
    currentBlockId,
    currentSequence = 1,
    scrollPercentage = 0,
    readingPercentage = 0,
    deviceId,
    clientRevision,
  }) {
    await this._assertBookOwner(bookId, userId)

    // Validate optional currentTocEntryId belongs to this book
    let validTocId = null
    if (currentTocEntryId) {
      const toc = await prisma.bookTableOfContents.findUnique({ where: { id: currentTocEntryId } })
      if (toc && toc.bookId === bookId) {
        validTocId = toc.id
      }
    }

    const existing = await prisma.readingProgress.findUnique({
      where: { userId_bookId: { userId, bookId } },
    })

    // Conflict resolution: reject stale revision if server already has a newer revision from another device
    if (existing && typeof clientRevision === 'number' && clientRevision < existing.revision) {
      return {
        conflict: true,
        progress: existing,
      }
    }

    const clampedScroll = Math.min(100, Math.max(0, Number(scrollPercentage) || 0))
    const clampedReading = Math.min(100, Math.max(0, Number(readingPercentage) || 0))
    const safeSeq = Math.max(1, parseInt(currentSequence, 10) || 1)
    const nextRevision = existing ? existing.revision + 1 : 1

    const progress = await prisma.readingProgress.upsert({
      where: { userId_bookId: { userId, bookId } },
      create: {
        userId,
        bookId,
        currentTocEntryId: validTocId,
        currentBlockId: currentBlockId || null,
        currentSequence: safeSeq,
        scrollPercentage: clampedScroll,
        readingPercentage: clampedReading,
        lastDeviceId: deviceId || null,
        revision: 1,
        lastReadAt: new Date(),
      },
      update: {
        currentTocEntryId: validTocId,
        currentBlockId: currentBlockId || null,
        currentSequence: safeSeq,
        scrollPercentage: clampedScroll,
        readingPercentage: clampedReading,
        lastDeviceId: deviceId || null,
        revision: nextRevision,
        lastReadAt: new Date(),
      },
    })

    // Publish real-time sync event to user's other devices
    await RealtimeSyncService.publishBookSyncEvent({
      userId,
      bookId,
      eventName: 'progress:updated',
      payload: {
        progress,
        deviceId: deviceId || null,
        revision: progress.revision,
      },
    })

    return {
      conflict: false,
      progress,
    }
  }

  static async getSyncState({ bookId, userId }) {
    const book = await this._assertBookOwner(bookId, userId)
    const progress = await prisma.readingProgress.findUnique({
      where: { userId_bookId: { userId, bookId } },
    })

    return {
      bookId: book.id,
      contentVersion: book.contentVersion,
      tocVersion: book.tocVersion,
      annotationsVersion: book.annotationsVersion,
      progress: progress || null,
      serverTime: new Date().toISOString(),
    }
  }
}
