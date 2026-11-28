/**
 * Annotations Service: Highlights, Bookmarks, and Reading Notes.
 * Enforces user ownership, increments Book.annotationsVersion, and publishes real-time sync events.
 */
import prisma from '../../config/database.js'
import { RealtimeSyncService } from '../../services/sync/realtimeSync.service.js'

export class AnnotationsService {
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

  static async _publishAnnotationSync(userId, bookId, type, action, record, annotationsVersion) {
    await RealtimeSyncService.publishBookSyncEvent({
      userId,
      bookId,
      eventName: 'annotations:updated',
      payload: { type, action, record, annotationsVersion },
    })
  }

  // ─── Highlights ─────────────────────────────────────────────────────────────

  static async listHighlights({ bookId, userId }) {
    await this._assertBookOwner(bookId, userId)
    const highlights = await prisma.highlight.findMany({
      where: { bookId, userId },
      orderBy: { createdAt: 'asc' },
    })
    return { highlights }
  }

  static async createHighlight({ bookId, userId, tocEntryId, selectedText, anchorData, color }) {
    await this._assertBookOwner(bookId, userId)

    const [highlight, updatedBook] = await prisma.$transaction([
      prisma.highlight.create({
        data: {
          userId,
          bookId,
          tocEntryId: tocEntryId || null,
          selectedText,
          anchorData,
          color,
        },
      }),
      prisma.book.update({
        where: { id: bookId },
        data: { annotationsVersion: { increment: 1 } },
      }),
    ])

    await this._publishAnnotationSync(userId, bookId, 'highlight', 'created', highlight, updatedBook.annotationsVersion)
    return { highlight, annotationsVersion: updatedBook.annotationsVersion }
  }

  static async updateHighlight({ highlightId, userId, color }) {
    const existing = await prisma.highlight.findUnique({ where: { id: highlightId } })
    if (!existing) {
      const err = new Error('Highlight not found')
      err.status = 404
      throw err
    }
    if (existing.userId !== userId) {
      const err = new Error('Access denied: You do not own this highlight')
      err.status = 403
      throw err
    }

    const [highlight, updatedBook] = await prisma.$transaction([
      prisma.highlight.update({
        where: { id: highlightId },
        data: { color },
      }),
      prisma.book.update({
        where: { id: existing.bookId },
        data: { annotationsVersion: { increment: 1 } },
      }),
    ])

    await this._publishAnnotationSync(userId, existing.bookId, 'highlight', 'updated', highlight, updatedBook.annotationsVersion)
    return { highlight, annotationsVersion: updatedBook.annotationsVersion }
  }

  static async deleteHighlight({ highlightId, userId }) {
    const existing = await prisma.highlight.findUnique({ where: { id: highlightId } })
    if (!existing) {
      const err = new Error('Highlight not found')
      err.status = 404
      throw err
    }
    if (existing.userId !== userId) {
      const err = new Error('Access denied: You do not own this highlight')
      err.status = 403
      throw err
    }

    const [, updatedBook] = await prisma.$transaction([
      prisma.highlight.delete({ where: { id: highlightId } }),
      prisma.book.update({
        where: { id: existing.bookId },
        data: { annotationsVersion: { increment: 1 } },
      }),
    ])

    await this._publishAnnotationSync(userId, existing.bookId, 'highlight', 'deleted', { id: highlightId }, updatedBook.annotationsVersion)
    return { message: 'Highlight deleted', annotationsVersion: updatedBook.annotationsVersion }
  }

  // ─── Bookmarks ──────────────────────────────────────────────────────────────

  static async listBookmarks({ bookId, userId }) {
    await this._assertBookOwner(bookId, userId)
    const bookmarks = await prisma.bookmark.findMany({
      where: { bookId, userId },
      orderBy: { createdAt: 'desc' },
    })
    return { bookmarks }
  }

  static async createBookmark({ bookId, userId, tocEntryId, chapterTitle, anchorData, selectedText, title, description }) {
    await this._assertBookOwner(bookId, userId)

    const [bookmark, updatedBook] = await prisma.$transaction([
      prisma.bookmark.create({
        data: {
          userId,
          bookId,
          tocEntryId: tocEntryId || null,
          chapterTitle: chapterTitle || null,
          anchorData,
          selectedText: selectedText || null,
          title,
          description: description || null,
        },
      }),
      prisma.book.update({
        where: { id: bookId },
        data: { annotationsVersion: { increment: 1 } },
      }),
    ])

    await this._publishAnnotationSync(userId, bookId, 'bookmark', 'created', bookmark, updatedBook.annotationsVersion)
    return { bookmark, annotationsVersion: updatedBook.annotationsVersion }
  }

  static async updateBookmark({ bookmarkId, userId, title, description }) {
    const existing = await prisma.bookmark.findUnique({ where: { id: bookmarkId } })
    if (!existing) {
      const err = new Error('Bookmark not found')
      err.status = 404
      throw err
    }
    if (existing.userId !== userId) {
      const err = new Error('Access denied: You do not own this bookmark')
      err.status = 403
      throw err
    }

    const data = {}
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description

    const [bookmark, updatedBook] = await prisma.$transaction([
      prisma.bookmark.update({ where: { id: bookmarkId }, data }),
      prisma.book.update({
        where: { id: existing.bookId },
        data: { annotationsVersion: { increment: 1 } },
      }),
    ])

    await this._publishAnnotationSync(userId, existing.bookId, 'bookmark', 'updated', bookmark, updatedBook.annotationsVersion)
    return { bookmark, annotationsVersion: updatedBook.annotationsVersion }
  }

  static async deleteBookmark({ bookmarkId, userId }) {
    const existing = await prisma.bookmark.findUnique({ where: { id: bookmarkId } })
    if (!existing) {
      const err = new Error('Bookmark not found')
      err.status = 404
      throw err
    }
    if (existing.userId !== userId) {
      const err = new Error('Access denied: You do not own this bookmark')
      err.status = 403
      throw err
    }

    const [, updatedBook] = await prisma.$transaction([
      prisma.bookmark.delete({ where: { id: bookmarkId } }),
      prisma.book.update({
        where: { id: existing.bookId },
        data: { annotationsVersion: { increment: 1 } },
      }),
    ])

    await this._publishAnnotationSync(userId, existing.bookId, 'bookmark', 'deleted', { id: bookmarkId }, updatedBook.annotationsVersion)
    return { message: 'Bookmark deleted', annotationsVersion: updatedBook.annotationsVersion }
  }

  // ─── Reading Notes ──────────────────────────────────────────────────────────

  static async listNotes({ bookId, userId, search }) {
    await this._assertBookOwner(bookId, userId)
    const where = { bookId, userId }
    if (search && search.trim()) {
      const term = search.trim()
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } },
        { selectedText: { contains: term, mode: 'insensitive' } },
      ]
    }
    const notes = await prisma.readingNote.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    })
    return { notes }
  }

  static async createNote({ bookId, userId, tocEntryId, chapterTitle, anchorData, selectedText, title, content }) {
    await this._assertBookOwner(bookId, userId)

    const [note, updatedBook] = await prisma.$transaction([
      prisma.readingNote.create({
        data: {
          userId,
          bookId,
          tocEntryId: tocEntryId || null,
          chapterTitle: chapterTitle || null,
          anchorData: anchorData || null,
          selectedText: selectedText || null,
          title,
          content,
        },
      }),
      prisma.book.update({
        where: { id: bookId },
        data: { annotationsVersion: { increment: 1 } },
      }),
    ])

    await this._publishAnnotationSync(userId, bookId, 'note', 'created', note, updatedBook.annotationsVersion)
    return { note, annotationsVersion: updatedBook.annotationsVersion }
  }

  static async updateNote({ noteId, userId, title, content }) {
    const existing = await prisma.readingNote.findUnique({ where: { id: noteId } })
    if (!existing) {
      const err = new Error('Reading note not found')
      err.status = 404
      throw err
    }
    if (existing.userId !== userId) {
      const err = new Error('Access denied: You do not own this reading note')
      err.status = 403
      throw err
    }

    const data = {}
    if (title !== undefined) data.title = title
    if (content !== undefined) data.content = content

    const [note, updatedBook] = await prisma.$transaction([
      prisma.readingNote.update({ where: { id: noteId }, data }),
      prisma.book.update({
        where: { id: existing.bookId },
        data: { annotationsVersion: { increment: 1 } },
      }),
    ])

    await this._publishAnnotationSync(userId, existing.bookId, 'note', 'updated', note, updatedBook.annotationsVersion)
    return { note, annotationsVersion: updatedBook.annotationsVersion }
  }

  static async deleteNote({ noteId, userId }) {
    const existing = await prisma.readingNote.findUnique({ where: { id: noteId } })
    if (!existing) {
      const err = new Error('Reading note not found')
      err.status = 404
      throw err
    }
    if (existing.userId !== userId) {
      const err = new Error('Access denied: You do not own this reading note')
      err.status = 403
      throw err
    }

    const [, updatedBook] = await prisma.$transaction([
      prisma.readingNote.delete({ where: { id: noteId } }),
      prisma.book.update({
        where: { id: existing.bookId },
        data: { annotationsVersion: { increment: 1 } },
      }),
    ])

    await this._publishAnnotationSync(userId, existing.bookId, 'note', 'deleted', { id: noteId }, updatedBook.annotationsVersion)
    return { message: 'Reading note deleted', annotationsVersion: updatedBook.annotationsVersion }
  }
}
