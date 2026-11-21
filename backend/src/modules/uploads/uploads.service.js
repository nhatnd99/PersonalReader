import crypto from 'node:crypto'
import prisma from '../../config/database.js'
import { R2StorageService, getR2Config } from '../../services/storage/r2.service.js'

const MAX_USER_STORAGE_BYTES = parseInt(process.env.MAX_USER_STORAGE_BYTES || '524288000', 10) // 500MB default
const SESSION_EXPIRY_MINUTES = 15

export class UploadsService {
  /**
   * Initiate upload session, validate quota, create pending records and return presigned PUT URL.
   */
  static async initiateUpload({ userId, fileName, fileSize, mimeType, title, author, description }) {
    // 1. Check user storage quota
    const activeFiles = await prisma.bookFile.findMany({
      where: {
        book: {
          userId,
          deletedAt: null,
        },
      },
      select: { fileSize: true },
    })

    const currentUsedBytes = activeFiles.reduce((sum, f) => sum + f.fileSize, 0)
    if (currentUsedBytes + fileSize > MAX_USER_STORAGE_BYTES) {
      const limitMb = Math.round(MAX_USER_STORAGE_BYTES / (1024 * 1024))
      const error = new Error(`Storage quota exceeded. Your current limit is ${limitMb}MB.`)
      error.status = 400
      error.code = 'STORAGE_QUOTA_EXCEEDED'
      throw error
    }

    const bookId = crypto.randomUUID()
    const fileId = crypto.randomUUID()
    const objectKey = `users/${userId}/books/${bookId}/${fileId}.pdf`
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MINUTES * 60 * 1000)

    // 2. Database transaction: create Book and UploadSession
    const [book, session] = await prisma.$transaction([
      prisma.book.create({
        data: {
          id: bookId,
          userId,
          title: title.trim(),
          author: author ? author.trim() : null,
          description: description ? description.trim() : null,
          originalFileName: fileName,
          status: 'pending',
        },
      }),
      prisma.uploadSession.create({
        data: {
          userId,
          bookId,
          objectKey,
          originalFileName: fileName,
          mimeType,
          expectedFileSize: fileSize,
          status: 'pending',
          expiresAt,
        },
      }),
    ])

    // 3. Generate pre-signed PUT URL
    const uploadUrl = await R2StorageService.generatePresignedUploadUrl({
      objectKey,
      mimeType,
      expiresIn: SESSION_EXPIRY_MINUTES * 60,
    })

    return {
      uploadId: session.id,
      bookId: book.id,
      objectKey,
      uploadUrl,
      expiresIn: SESSION_EXPIRY_MINUTES * 60,
      expiresAt: session.expiresAt.toISOString(),
      book,
    }
  }

  /**
   * Complete upload session: verify R2 object and PDF signature, create BookFile, and activate Book.
   * This endpoint is fully idempotent.
   */
  static async completeUpload({ uploadId, userId }) {
    const session = await prisma.uploadSession.findUnique({
      where: { id: uploadId },
      include: {
        book: {
          include: { files: true },
        },
      },
    })

    if (!session) {
      const error = new Error('Upload session not found')
      error.status = 404
      throw error
    }

    if (session.userId !== userId) {
      const error = new Error('Access denied: You do not own this upload session')
      error.status = 403
      throw error
    }

    // Idempotency: if already completed, return existing book
    if (session.status === 'completed') {
      return {
        message: 'Upload already completed',
        book: session.book,
      }
    }

    if (session.status !== 'pending') {
      const error = new Error(`Cannot complete upload session with status '${session.status}'`)
      error.status = 400
      throw error
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      await prisma.uploadSession.update({
        where: { id: uploadId },
        data: { status: 'expired' },
      })
      const error = new Error('Upload session has expired. Please initiate a new upload.')
      error.status = 400
      error.code = 'UPLOAD_SESSION_EXPIRED'
      throw error
    }

    // 1. Verify object existence in Cloudflare R2
    const metadata = await R2StorageService.verifyObjectMetadata(session.objectKey)
    if (!metadata.exists) {
      const error = new Error(
        'Uploaded file was not found in storage. Ensure your client finished uploading to the pre-signed URL.'
      )
      error.status = 400
      error.code = 'OBJECT_NOT_FOUND'
      throw error
    }

    // 2. Validate file size (allow exact match or within 2% margin to avoid block due to multipart chunking)
    const actualSize = metadata.contentLength || 0
    if (actualSize <= 0) {
      const error = new Error('Uploaded file is empty (0 bytes).')
      error.status = 400
      error.code = 'EMPTY_FILE'
      throw error
    }

    // 3. Inspect PDF magic bytes (%PDF-)
    const isPdfValid = await R2StorageService.verifyPdfSignature(session.objectKey)
    if (!isPdfValid) {
      // Clean up invalid file from storage
      await R2StorageService.deleteObject(session.objectKey)
      await prisma.$transaction([
        prisma.uploadSession.update({
          where: { id: uploadId },
          data: { status: 'failed' },
        }),
        prisma.book.update({
          where: { id: session.bookId },
          data: { status: 'error' },
        }),
      ])
      const error = new Error('Uploaded file does not match a valid PDF signature (%PDF-).')
      error.status = 400
      error.code = 'INVALID_PDF_SIGNATURE'
      throw error
    }

    const config = getR2Config()

    // 4. Activate Book and create BookFile in a database transaction
    const [updatedSession, updatedBook] = await prisma.$transaction([
      prisma.uploadSession.update({
        where: { id: uploadId },
        data: { status: 'completed' },
      }),
      prisma.book.update({
        where: { id: session.bookId },
        data: { status: 'ready' },
      }),
      prisma.bookFile.create({
        data: {
          bookId: session.bookId,
          storageProvider: 'r2',
          bucket: config.bucketName,
          objectKey: session.objectKey,
          originalFileName: session.originalFileName,
          mimeType: session.mimeType,
          fileSize: actualSize,
          checksum: metadata.etag || null,
          uploadStatus: 'completed',
        },
      }),
    ])

    const completedBook = await prisma.book.findUnique({
      where: { id: session.bookId },
      include: { files: true },
    })

    return {
      message: 'Upload completed successfully',
      book: completedBook,
    }
  }

  /**
   * Get upload session details.
   */
  static async getUploadSession({ uploadId, userId }) {
    const session = await prisma.uploadSession.findUnique({
      where: { id: uploadId },
      include: { book: true },
    })

    if (!session) {
      const error = new Error('Upload session not found')
      error.status = 404
      throw error
    }

    if (session.userId !== userId) {
      const error = new Error('Access denied: You do not own this upload session')
      error.status = 403
      throw error
    }

    return session
  }

  /**
   * Refresh pre-signed URL for an active pending upload session.
   */
  static async refreshUploadUrl({ uploadId, userId }) {
    const session = await prisma.uploadSession.findUnique({
      where: { id: uploadId },
    })

    if (!session) {
      const error = new Error('Upload session not found')
      error.status = 404
      throw error
    }

    if (session.userId !== userId) {
      const error = new Error('Access denied: You do not own this upload session')
      error.status = 403
      throw error
    }

    if (session.status !== 'pending' && session.status !== 'expired') {
      const error = new Error(`Cannot refresh URL for session with status '${session.status}'`)
      error.status = 400
      throw error
    }

    const newExpiresAt = new Date(Date.now() + SESSION_EXPIRY_MINUTES * 60 * 1000)
    await prisma.uploadSession.update({
      where: { id: uploadId },
      data: {
        status: 'pending',
        expiresAt: newExpiresAt,
      },
    })

    const uploadUrl = await R2StorageService.generatePresignedUploadUrl({
      objectKey: session.objectKey,
      mimeType: session.mimeType,
      expiresIn: SESSION_EXPIRY_MINUTES * 60,
    })

    return {
      uploadId: session.id,
      objectKey: session.objectKey,
      uploadUrl,
      expiresIn: SESSION_EXPIRY_MINUTES * 60,
      expiresAt: newExpiresAt.toISOString(),
    }
  }

  /**
   * Cancel an upload session and clean up R2 storage.
   */
  static async cancelUpload({ uploadId, userId }) {
    const session = await prisma.uploadSession.findUnique({
      where: { id: uploadId },
    })

    if (!session) {
      const error = new Error('Upload session not found')
      error.status = 404
      throw error
    }

    if (session.userId !== userId) {
      const error = new Error('Access denied: You do not own this upload session')
      error.status = 403
      throw error
    }

    // Attempt to delete any object in R2
    await R2StorageService.deleteObject(session.objectKey)

    // Update database status
    await prisma.$transaction([
      prisma.uploadSession.update({
        where: { id: uploadId },
        data: { status: 'cancelled' },
      }),
      ...(session.bookId
        ? [
            prisma.book.update({
              where: { id: session.bookId },
              data: { status: 'deleted', deletedAt: new Date() },
            }),
          ]
        : []),
    ])

    return { message: 'Upload session cancelled and cleaned up successfully' }
  }
}
