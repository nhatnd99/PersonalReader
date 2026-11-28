import { AnnotationsService } from './annotations.service.js'
import {
  createHighlightSchema,
  updateHighlightSchema,
  createBookmarkSchema,
  updateBookmarkSchema,
  createNoteSchema,
  updateNoteSchema,
} from './annotations.validation.js'

function handleZodOrNext(err, res, next) {
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    })
  }
  return next(err)
}

export class AnnotationsController {
  // ─── Highlights ─────────────────────────────────────────────────────────────

  static async listHighlights(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const result = await AnnotationsService.listHighlights({ bookId: req.params.bookId, userId })
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  static async createHighlight(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const data = createHighlightSchema.parse(req.body)
      const result = await AnnotationsService.createHighlight({ bookId: req.params.bookId, userId, ...data })
      res.status(201).json(result)
    } catch (err) {
      handleZodOrNext(err, res, next)
    }
  }

  static async updateHighlight(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const data = updateHighlightSchema.parse(req.body)
      const result = await AnnotationsService.updateHighlight({ highlightId: req.params.highlightId, userId, ...data })
      res.status(200).json(result)
    } catch (err) {
      handleZodOrNext(err, res, next)
    }
  }

  static async deleteHighlight(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const result = await AnnotationsService.deleteHighlight({ highlightId: req.params.highlightId, userId })
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  // ─── Bookmarks ──────────────────────────────────────────────────────────────

  static async listBookmarks(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const result = await AnnotationsService.listBookmarks({ bookId: req.params.bookId, userId })
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  static async createBookmark(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const data = createBookmarkSchema.parse(req.body)
      const result = await AnnotationsService.createBookmark({ bookId: req.params.bookId, userId, ...data })
      res.status(201).json(result)
    } catch (err) {
      handleZodOrNext(err, res, next)
    }
  }

  static async updateBookmark(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const data = updateBookmarkSchema.parse(req.body)
      const result = await AnnotationsService.updateBookmark({ bookmarkId: req.params.bookmarkId, userId, ...data })
      res.status(200).json(result)
    } catch (err) {
      handleZodOrNext(err, res, next)
    }
  }

  static async deleteBookmark(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const result = await AnnotationsService.deleteBookmark({ bookmarkId: req.params.bookmarkId, userId })
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  // ─── Reading Notes ──────────────────────────────────────────────────────────

  static async listNotes(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const result = await AnnotationsService.listNotes({
        bookId: req.params.bookId,
        userId,
        search: req.query.search,
      })
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  static async createNote(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const data = createNoteSchema.parse(req.body)
      const result = await AnnotationsService.createNote({ bookId: req.params.bookId, userId, ...data })
      res.status(201).json(result)
    } catch (err) {
      handleZodOrNext(err, res, next)
    }
  }

  static async updateNote(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const data = updateNoteSchema.parse(req.body)
      const result = await AnnotationsService.updateNote({ noteId: req.params.noteId, userId, ...data })
      res.status(200).json(result)
    } catch (err) {
      handleZodOrNext(err, res, next)
    }
  }

  static async deleteNote(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const result = await AnnotationsService.deleteNote({ noteId: req.params.noteId, userId })
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }
}
