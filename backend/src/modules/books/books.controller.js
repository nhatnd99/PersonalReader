import { BooksService } from './books.service.js'
import { BookImportService } from './bookImport.service.js'
import { listBooksQuerySchema, updateBookSchema } from './books.validation.js'

export class BooksController {
  /**
   * In-memory multipart PDF import & HTML transformation.
   */
  static async importBook(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const file = req.file

      if (!file) {
        return res.status(400).json({ error: 'PDF file is required (field name: "file").' })
      }

      const originalFileName = file.originalname || 'book.pdf'
      if (!/\.pdf$/i.test(originalFileName)) {
        return res.status(400).json({ error: 'Only PDF files (.pdf) are supported.' })
      }

      const mime = (file.mimetype || '').toLowerCase()
      if (mime && !['application/pdf', 'application/x-pdf', 'application/octet-stream', 'binary/octet-stream'].includes(mime)) {
        return res.status(400).json({ error: 'Invalid MIME type. Expected application/pdf.' })
      }

      const { title, author, description, language } = req.body || {}
      const asyncMode = process.env.ASYNC_PDF_IMPORT === 'true' && req.query.async === 'true'

      const result = await BookImportService.importPdfBuffer({
        userId,
        buffer: file.buffer,
        originalFileName,
        title,
        author,
        description,
        language,
        asyncMode,
      })

      // Release multer buffer reference on request object immediately
      req.file.buffer = null

      res.status(asyncMode ? 202 : 201).json({
        message: asyncMode ? 'PDF import started' : 'PDF imported and converted to structured HTML',
        book: result.book,
        job: result.job,
      })
    } catch (err) {
      if (req.file) req.file.buffer = null
      next(err)
    }
  }

  /**
   * Get import job status.
   */
  static async getImportJob(req, res, next) {
    try {
      const { jobId } = req.params
      const userId = req.user.sub || req.user.id
      const job = await BookImportService.getImportJob({ jobId, userId })
      res.status(200).json({ job })
    } catch (err) {
      next(err)
    }
  }

  /**
   * Cancel active import job.
   */
  static async cancelImportJob(req, res, next) {
    try {
      const { jobId } = req.params
      const userId = req.user.sub || req.user.id
      const result = await BookImportService.cancelImportJob({ jobId, userId })
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  /**
   * List books for authenticated user.
   */
  static async list(req, res, next) {
    try {
      const query = listBooksQuerySchema.parse(req.query)
      const userId = req.user.sub || req.user.id

      const result = await BooksService.listBooks({
        userId,
        ...query,
      })

      res.status(200).json(result)
    } catch (err) {
      if (err.name === 'ZodError') {
        return res.status(400).json({
          error: 'Validation failed',
          details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        })
      }
      next(err)
    }
  }

  /**
   * Get single book by ID.
   */
  static async getById(req, res, next) {
    try {
      const { bookId } = req.params
      const userId = req.user.sub || req.user.id

      const book = await BooksService.getBookById({
        bookId,
        userId,
      })

      res.status(200).json({ book })
    } catch (err) {
      next(err)
    }
  }

  /**
   * Get ordered HTML content chunks for a book.
   */
  static async getContents(req, res, next) {
    try {
      const { bookId } = req.params
      const userId = req.user.sub || req.user.id
      const { page, limit } = req.query

      const result = await BooksService.getBookContents({
        bookId,
        userId,
        page,
        limit,
      })

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  /**
   * Get detected chapters for a book.
   */
  static async getChapters(req, res, next) {
    try {
      const { bookId } = req.params
      const userId = req.user.sub || req.user.id

      const result = await BooksService.getBookChapters({
        bookId,
        userId,
      })

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  /**
   * Update book metadata.
   */
  static async update(req, res, next) {
    try {
      const { bookId } = req.params
      const validatedData = updateBookSchema.parse(req.body)
      const userId = req.user.sub || req.user.id

      const book = await BooksService.updateBook({
        bookId,
        userId,
        ...validatedData,
      })

      res.status(200).json({
        message: 'Book updated successfully',
        book,
      })
    } catch (err) {
      if (err.name === 'ZodError') {
        return res.status(400).json({
          error: 'Validation failed',
          details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        })
      }
      next(err)
    }
  }

  /**
   * Delete book.
   */
  static async delete(req, res, next) {
    try {
      const { bookId } = req.params
      const userId = req.user.sub || req.user.id

      const result = await BooksService.deleteBook({
        bookId,
        userId,
      })

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  /**
   * Get pre-signed download URL (legacy compatibility).
   */
  static async getDownloadUrl(req, res, next) {
    try {
      const { bookId } = req.params
      const userId = req.user.sub || req.user.id

      const result = await BooksService.generateDownloadUrl({
        bookId,
        userId,
      })

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }
}
