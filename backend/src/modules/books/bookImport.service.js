/**
 * In-Memory PDF Import & Processing Service.
 * Orchestrates concurrency limits, PDF.js extraction, HTML transformation,
 * batched PostgreSQL persistence, and strict resource cleanup.
 */
import prisma from '../../config/database.js'
import { extractPdfFromMemory } from '../../services/pdf/pdfExtractor.js'
import { transformPagesToStructuredHtml } from '../../services/pdf/htmlTransformer.js'

const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_IMPORT_JOBS || '3', 10)
const PROCESSING_TIMEOUT_MS = parseInt(process.env.PDF_PROCESSING_TIMEOUT_MS || '45000', 10)
const MAX_EXTRACTED_BYTES = parseInt(process.env.MAX_EXTRACTED_HTML_BYTES || String(15 * 1024 * 1024), 10)
const DB_BATCH_SIZE = 25

let activeProcessingCount = 0
const cancelledJobs = new Set()

export function getActiveProcessingCount() {
  return activeProcessingCount
}

export function requestJobCancellation(jobId) {
  cancelledJobs.add(jobId)
}

export class BookImportService {
  /**
   * Creates a Book + BookImportJob record and processes the in-memory PDF buffer.
   * Never retains the PDF buffer in globals, disk, or object storage.
   */
  static async importPdfBuffer({ userId, buffer, originalFileName, title, author, description, language, asyncMode = false }) {
    if (activeProcessingCount >= MAX_CONCURRENT_JOBS) {
      const err = new Error('Server is currently busy processing other books. Please try again in a moment.')
      err.status = 503
      err.code = 'PROCESSING_CAPACITY_REACHED'
      throw err
    }

    const cleanTitle = (title && title.trim()) || originalFileName.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim() || 'Untitled Book'

    // 1. Create pending Book & BookImportJob atomically
    const { book, job } = await prisma.$transaction(async (tx) => {
      const createdBook = await tx.book.create({
        data: {
          userId,
          title: cleanTitle.slice(0, 255),
          author: author ? author.trim().slice(0, 255) : null,
          description: description ? description.trim().slice(0, 1000) : null,
          language: language ? language.trim().slice(0, 50) : 'English',
          originalFileName: originalFileName.slice(0, 255),
          status: 'pending',
          processingStatus: 'PROCESSING',
        },
      })

      const createdJob = await tx.bookImportJob.create({
        data: {
          userId,
          bookId: createdBook.id,
          status: 'PROCESSING',
          progress: 10,
          currentStep: 'Validating PDF in memory',
        },
      })

      return { book: createdBook, job: createdJob }
    })

    if (asyncMode) {
      // Persistent server mode: detach processing and let client poll GET /import/:jobId
      this._runInMemoryPipeline({ jobId: job.id, bookId: book.id, buffer, originalTitle: cleanTitle }).catch((err) => {
        console.error(`[BookImportService] Async job ${job.id} failed:`, err.message)
      })
      return { book, job, async: true }
    }

    // Serverless-safe mode: process in-memory within request lifecycle before returning
    const finalResult = await this._runInMemoryPipeline({
      jobId: job.id,
      bookId: book.id,
      buffer,
      originalTitle: cleanTitle,
    })

    return finalResult
  }

  /**
   * Executes extraction, HTML transformation, and batched DB persistence,
   * guaranteeing cleanup of references in all code paths.
   */
  static async _runInMemoryPipeline({ jobId, bookId, buffer, originalTitle }) {
    activeProcessingCount++
    let localBuffer = buffer
    let extracted = null
    let transformed = null

    const updateJobProgress = async (progress, currentStep) => {
      try {
        await prisma.bookImportJob.update({
          where: { id: jobId },
          data: { progress, currentStep },
        })
      } catch (_) {}
    }

    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        const err = new Error('PDF processing timed out.')
        err.status = 408
        err.code = 'PROCESSING_TIMEOUT'
        reject(err)
      }, PROCESSING_TIMEOUT_MS)
      if (typeof timer.unref === 'function') timer.unref()
    })

    try {
      const pipelineWork = (async () => {
        // 1. Extract text & layout page-by-page from Uint8Array
        extracted = await extractPdfFromMemory(localBuffer, {
          onProgress: updateJobProgress,
          shouldCancel: () => cancelledJobs.has(jobId),
        })

        // Release raw PDF buffer reference as soon as PDF.js finishes reading pages
        localBuffer = null

        if (extracted.needsOcr) {
          await prisma.$transaction([
            prisma.book.update({
              where: { id: bookId },
              data: {
                totalPages: extracted.totalPages,
                pageCount: extracted.totalPages,
                processingStatus: 'NEEDS_OCR',
                status: 'error',
              },
            }),
            prisma.bookImportJob.update({
              where: { id: jobId },
              data: {
                status: 'NEEDS_OCR',
                progress: 100,
                currentStep: 'Insufficient extractable text',
                errorMessage: 'This PDF appears to be scanned or image-only. OCR is not supported in this version.',
                completedAt: new Date(),
              },
            }),
          ])

          const err = new Error('Scanned PDF detected (insufficient extractable text). OCR is required.')
          err.status = 422
          err.code = 'NEEDS_OCR'
          err.jobId = jobId
          err.bookId = bookId
          throw err
        }

        await updateJobProgress(80, 'Transforming into structured HTML')

        // 2. Transform pages into sanitized HTML chunks and chapters
        transformed = transformPagesToStructuredHtml(extracted.pages)
        const totalPages = extracted.totalPages
        const inferredAuthor = extracted.metadata?.Author ? String(extracted.metadata.Author).trim() : null

        // Release intermediate page items
        extracted = null

        const totalHtmlBytes = transformed.chunks.reduce((acc, c) => acc + Buffer.byteLength(c.contentHtml, 'utf8'), 0)
        if (totalHtmlBytes > MAX_EXTRACTED_BYTES) {
          const err = new Error('Extracted book content exceeds maximum allowed storage size.')
          err.status = 400
          err.code = 'CONTENT_TOO_LARGE'
          throw err
        }

        await updateJobProgress(90, 'Saving structured content to database')

        // 3. Persist chunks and chapters in controlled batches inside transaction
        await prisma.$transaction(async (tx) => {
          for (let i = 0; i < transformed.chunks.length; i += DB_BATCH_SIZE) {
            const batch = transformed.chunks.slice(i, i + DB_BATCH_SIZE)
            await tx.bookContent.createMany({
              data: batch.map((c) => ({
                bookId,
                sequence: c.sequence,
                contentHtml: c.contentHtml,
                plainText: c.plainText,
                sourcePageStart: c.sourcePageStart,
                sourcePageEnd: c.sourcePageEnd,
                wordCount: c.wordCount,
              })),
            })
          }

          if (transformed.chapters.length > 0) {
            await tx.bookChapter.createMany({
              data: transformed.chapters.map((ch) => ({
                bookId,
                title: ch.title,
                sequence: ch.sequence,
                startContentSequence: ch.startContentSequence,
                endContentSequence: ch.endContentSequence,
              })),
            })
          }

          await tx.book.update({
            where: { id: bookId },
            data: {
              totalPages,
              pageCount: totalPages,
              totalWords: transformed.totalWords,
              processingStatus: 'COMPLETED',
              status: 'ready',
              ...(inferredAuthor ? { author: inferredAuthor.slice(0, 255) } : {}),
            },
          })

          await tx.bookImportJob.update({
            where: { id: jobId },
            data: {
              status: 'COMPLETED',
              progress: 100,
              currentStep: 'Completed',
              completedAt: new Date(),
            },
          })
        })

        const [completedBook, completedJob] = await Promise.all([
          prisma.book.findUnique({ where: { id: bookId } }),
          prisma.bookImportJob.findUnique({ where: { id: jobId } }),
        ])

        return { book: completedBook, job: completedJob, async: false }
      })()

      return await Promise.race([pipelineWork, timeoutPromise])
    } catch (err) {
      if (err.code !== 'NEEDS_OCR') {
        const isCancelled = err.code === 'JOB_CANCELLED' || cancelledJobs.has(jobId)
        const finalStatus = isCancelled ? 'CANCELLED' : 'FAILED'
        try {
          await prisma.$transaction([
            prisma.bookContent.deleteMany({ where: { bookId } }),
            prisma.bookChapter.deleteMany({ where: { bookId } }),
            prisma.book.update({
              where: { id: bookId },
              data: {
                processingStatus: finalStatus,
                status: isCancelled ? 'deleted' : 'error',
                ...(isCancelled ? { deletedAt: new Date() } : {}),
              },
            }),
            prisma.bookImportJob.update({
              where: { id: jobId },
              data: {
                status: finalStatus,
                currentStep: isCancelled ? 'Cancelled' : 'Failed',
                errorMessage: err.message?.slice(0, 500) || 'Processing failed',
                completedAt: new Date(),
              },
            }),
          ])
        } catch (_) {}
      }
      throw err
    } finally {
      activeProcessingCount = Math.max(0, activeProcessingCount - 1)
      cancelledJobs.delete(jobId)
      localBuffer = null
      extracted = null
      transformed = null
    }
  }

  /**
   * Retrieve import job status with ownership check.
   */
  static async getImportJob({ jobId, userId }) {
    const job = await prisma.bookImportJob.findUnique({
      where: { id: jobId },
      include: { book: true },
    })

    if (!job) {
      const err = new Error('Import job not found')
      err.status = 404
      throw err
    }

    if (job.userId !== userId) {
      const err = new Error('Access denied: You do not own this import job')
      err.status = 403
      throw err
    }

    return job
  }

  /**
   * Cancel an active import job.
   */
  static async cancelImportJob({ jobId, userId }) {
    const job = await this.getImportJob({ jobId, userId })
    if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
      return { message: `Job already in ${job.status} state`, job }
    }

    requestJobCancellation(jobId)
    const updated = await prisma.bookImportJob.update({
      where: { id: jobId },
      data: { status: 'CANCELLED', currentStep: 'Cancelled by user', completedAt: new Date() },
    })
    return { message: 'Import job cancelled', job: updated }
  }
}
