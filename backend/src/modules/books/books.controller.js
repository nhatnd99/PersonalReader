import { BooksService } from './books.service.js'
import { listBooksQuerySchema, updateBookSchema } from './books.validation.js'

export class BooksController {
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
   * Get pre-signed download URL.
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
