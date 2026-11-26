import prisma from '../../config/database.js'
import { R2StorageService } from '../../services/storage/r2.service.js'

export class BooksService {
  /**
   * List books belonging to the authenticated user with search, filter, and pagination.
   */
  static async listBooks({ userId, page = 1, limit = 20, search, sort = 'newest' }) {
    const skip = (page - 1) * limit

    const where = {
      userId,
      deletedAt: null,
      status: 'ready',
    }

    if (search && search.trim()) {
      const term = search.trim()
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { originalFileName: { contains: term, mode: 'insensitive' } },
        { author: { contains: term, mode: 'insensitive' } },
      ]
    }

    let orderBy = { createdAt: 'desc' }
    if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' }
    } else if (sort === 'updated') {
      orderBy = { updatedAt: 'desc' }
    } else if (sort === 'title') {
      orderBy = { title: 'asc' }
    }

    const [total, books] = await Promise.all([
      prisma.book.count({ where }),
      prisma.book.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          files: {
            take: 1,
            select: {
              id: true,
              fileSize: true,
              mimeType: true,
              uploadStatus: true,
              createdAt: true,
            },
          },
        },
      }),
    ])

    return {
      books,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }

  /**
   * Get book details by ID with ownership enforcement.
   */
  static async getBookById({ bookId, userId }) {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        files: true,
      },
    })

    if (!book || book.deletedAt !== null) {
      const error = new Error('Book not found')
      error.status = 404
      throw error
    }

    if (book.userId !== userId) {
      const error = new Error('Access denied: You do not own this book')
      error.status = 403
      throw error
    }

    return book
  }

  /**
   * Update book metadata (title, author, description).
   */
  static async updateBook({ bookId, userId, title, author, description, language }) {
    // 1. Verify existence and ownership
    await this.getBookById({ bookId, userId })

    const updateData = {}
    if (title !== undefined) updateData.title = title.trim()
    if (author !== undefined) updateData.author = author ? author.trim() : null
    if (description !== undefined) updateData.description = description ? description.trim() : null
    if (language !== undefined) updateData.language = language ? language.trim() : null

    const updatedBook = await prisma.book.update({
      where: { id: bookId },
      data: updateData,
      include: { files: true },
    })

    return updatedBook
  }

  /**
   * Soft-delete book and clean up R2 file storage.
   */
  static async deleteBook({ bookId, userId }) {
    const book = await this.getBookById({ bookId, userId })

    // 1. Soft delete book in DB
    await prisma.book.update({
      where: { id: bookId },
      data: {
        status: 'deleted',
        deletedAt: new Date(),
      },
    })

    // 2. Remove files from R2 storage safely
    if (book.files && book.files.length > 0) {
      for (const file of book.files) {
        if (file.objectKey) {
          try {
            await R2StorageService.deleteObject(file.objectKey)
          } catch (r2Err) {
            console.error(`[BooksService] Failed to clean up R2 object ${file.objectKey}:`, r2Err.message)
          }
        }
      }
    }

    return { message: 'Book deleted successfully' }
  }

  /**
   * Generate short-lived signed GET URL for downloading the original PDF.
   */
  static async generateDownloadUrl({ bookId, userId }) {
    const book = await this.getBookById({ bookId, userId })

    const file = book.files?.[0]
    if (!file || !file.objectKey) {
      const error = new Error('File not found for this book or upload not yet ready')
      error.status = 404
      throw error
    }

    const downloadUrl = await R2StorageService.generatePresignedDownloadUrl({
      objectKey: file.objectKey,
      downloadFilename: book.originalFileName,
      expiresIn: 300, // 5 minutes
    })

    return {
      downloadUrl,
      fileName: book.originalFileName,
      expiresIn: 300,
    }
  }

  /**
   * Return ordered structured HTML chunks for a book with pagination.
   */
  static async getBookContents({ bookId, userId, page = 1, limit = 10 }) {
    await this.getBookById({ bookId, userId })

    const safePage = Math.max(1, parseInt(page, 10) || 1)
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10))
    const skip = (safePage - 1) * safeLimit

    const [total, contents] = await Promise.all([
      prisma.bookContent.count({ where: { bookId } }),
      prisma.bookContent.findMany({
        where: { bookId },
        orderBy: { sequence: 'asc' },
        skip,
        take: safeLimit,
      }),
    ])

    return {
      contents,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
    }
  }

  /**
   * Return detected chapters for a book ordered by sequence.
   */
  static async getBookChapters({ bookId, userId }) {
    await this.getBookById({ bookId, userId })

    const chapters = await prisma.bookChapter.findMany({
      where: { bookId },
      orderBy: { sequence: 'asc' },
    })

    return { chapters }
  }
}
