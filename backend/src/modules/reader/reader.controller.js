import prisma from '../../config/database.js'
import { TocService } from './toc.service.js'
import { ProgressService } from './progress.service.js'
import { PreferencesService } from './preferences.service.js'
import { RealtimeSyncService } from '../../services/sync/realtimeSync.service.js'
import {
  createTocEntrySchema,
  updateTocEntrySchema,
  reorderTocSchema,
  upsertProgressSchema,
  upsertPreferencesSchema,
} from './reader.validation.js'

export class ReaderController {
  /**
   * GET /api/v1/books/:bookId/reader
   * Returns book metadata, ordered HTML chunks, TOC, saved progress, and user reading preferences.
   */
  static async getReaderBundle(req, res, next) {
    try {
      const { bookId } = req.params
      const userId = req.user.sub || req.user.id

      const book = await prisma.book.findUnique({
        where: { id: bookId },
        select: {
          id: true,
          userId: true,
          title: true,
          author: true,
          description: true,
          language: true,
          status: true,
          processingStatus: true,
          totalPages: true,
          totalWords: true,
          contentVersion: true,
          tocVersion: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
      })

      if (!book || book.deletedAt !== null) {
        return res.status(404).json({ error: 'Book not found' })
      }
      if (book.userId !== userId) {
        return res.status(403).json({ error: 'Access denied: You do not own this book' })
      }
      if (book.processingStatus !== 'COMPLETED' && book.status !== 'ready') {
        return res.status(409).json({
          error: `Book is not ready for reading (status: ${book.processingStatus || book.status}).`,
          processingStatus: book.processingStatus,
        })
      }

      const [contents, tocResult, progress, preferences] = await Promise.all([
        prisma.bookContent.findMany({
          where: { bookId },
          orderBy: { sequence: 'asc' },
          select: {
            id: true,
            sequence: true,
            contentHtml: true,
            sourcePageStart: true,
            sourcePageEnd: true,
            wordCount: true,
          },
        }),
        TocService.getOrGenerateToc({ bookId, userId }),
        ProgressService.getProgress({ bookId, userId }),
        PreferencesService.getPreferences(userId),
      ])

      res.status(200).json({
        book,
        contents,
        toc: tocResult.entries,
        tocVersion: tocResult.tocVersion,
        progress,
        preferences,
      })
    } catch (err) {
      next(err)
    }
  }

  // ─── Table of Contents Endpoints ────────────────────────────────────────────

  static async getToc(req, res, next) {
    try {
      const { bookId } = req.params
      const userId = req.user.sub || req.user.id
      const result = await TocService.getOrGenerateToc({ bookId, userId })
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  static async createTocEntry(req, res, next) {
    try {
      const { bookId } = req.params
      const userId = req.user.sub || req.user.id
      const data = createTocEntrySchema.parse(req.body)
      const result = await TocService.createManualEntry({ bookId, userId, ...data })
      res.status(201).json(result)
    } catch (err) {
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: err.errors })
      }
      next(err)
    }
  }

  static async updateTocEntry(req, res, next) {
    try {
      const { bookId, entryId } = req.params
      const userId = req.user.sub || req.user.id
      const data = updateTocEntrySchema.parse(req.body)
      const result = await TocService.updateEntry({ bookId, entryId, userId, ...data })
      res.status(200).json(result)
    } catch (err) {
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: err.errors })
      }
      next(err)
    }
  }

  static async deleteTocEntry(req, res, next) {
    try {
      const { bookId, entryId } = req.params
      const userId = req.user.sub || req.user.id
      const result = await TocService.deleteEntry({ bookId, entryId, userId })
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  static async reorderToc(req, res, next) {
    try {
      const { bookId } = req.params
      const userId = req.user.sub || req.user.id
      const { items } = reorderTocSchema.parse(req.body)
      const result = await TocService.reorderEntries({ bookId, userId, items })
      res.status(200).json(result)
    } catch (err) {
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: err.errors })
      }
      next(err)
    }
  }

  static async resetToc(req, res, next) {
    try {
      const { bookId } = req.params
      const userId = req.user.sub || req.user.id
      const result = await TocService.resetToAuto({ bookId, userId })
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  // ─── Reading Progress & Sync Endpoints ──────────────────────────────────────

  static async getProgress(req, res, next) {
    try {
      const { bookId } = req.params
      const userId = req.user.sub || req.user.id
      const progress = await ProgressService.getProgress({ bookId, userId })
      res.status(200).json({ progress })
    } catch (err) {
      next(err)
    }
  }

  static async upsertProgress(req, res, next) {
    try {
      const { bookId } = req.params
      const userId = req.user.sub || req.user.id
      const data = upsertProgressSchema.parse(req.body)
      const result = await ProgressService.upsertProgress({ bookId, userId, ...data })
      res.status(200).json(result)
    } catch (err) {
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: err.errors })
      }
      next(err)
    }
  }

  static async getSyncState(req, res, next) {
    try {
      const { bookId } = req.params
      const userId = req.user.sub || req.user.id
      const state = await ProgressService.getSyncState({ bookId, userId })
      res.status(200).json(state)
    } catch (err) {
      next(err)
    }
  }

  // ─── Reading Preferences Endpoints ──────────────────────────────────────────

  static async getPreferences(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const preferences = await PreferencesService.getPreferences(userId)
      res.status(200).json({ preferences })
    } catch (err) {
      next(err)
    }
  }

  static async upsertPreferences(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const data = upsertPreferencesSchema.parse(req.body)
      const preferences = await PreferencesService.upsertPreferences(userId, data)
      res.status(200).json({ preferences })
    } catch (err) {
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: err.errors })
      }
      next(err)
    }
  }

  // ─── Real-Time Provider Auth Token ──────────────────────────────────────────

  static async issueSyncToken(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const tokenPayload = await RealtimeSyncService.issueClientToken(userId)
      res.status(200).json(tokenPayload)
    } catch (err) {
      next(err)
    }
  }
}
