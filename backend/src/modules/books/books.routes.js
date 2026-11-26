import { Router } from 'express'
import multer from 'multer'
import { rateLimit } from 'express-rate-limit'
import { authenticate } from '../../middleware/auth.js'
import { BooksController } from './books.controller.js'

const router = Router()

const MAX_IMPORT_PDF_BYTES = parseInt(process.env.MAX_IMPORT_PDF_BYTES || '10485760', 10) // 10MB default

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMPORT_PDF_BYTES,
    files: 1,
  },
})

const importLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many PDF import requests. Please wait before trying again.' },
})

const fileUrlLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many file URL requests. Please wait before trying again.' },
})

// All book endpoints require authentication
router.use(authenticate)

// In-memory PDF import & job tracking
router.post('/import', importLimiter, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        const maxMb = Math.round(MAX_IMPORT_PDF_BYTES / (1024 * 1024))
        return res.status(400).json({ error: `PDF file exceeds maximum allowed size of ${maxMb}MB.` })
      }
      return res.status(400).json({ error: err.message })
    }
    if (err) return next(err)
    next()
  })
}, BooksController.importBook)

router.get('/import/:jobId', BooksController.getImportJob)
router.post('/import/:jobId/cancel', BooksController.cancelImportJob)

// Library CRUD & Structured Content Retrieval
router.get('/', BooksController.list)
router.get('/:bookId', BooksController.getById)
router.get('/:bookId/contents', BooksController.getContents)
router.get('/:bookId/chapters', BooksController.getChapters)
router.patch('/:bookId', BooksController.update)
router.delete('/:bookId', BooksController.delete)
router.get('/:bookId/download-url', fileUrlLimiter, BooksController.getDownloadUrl)
router.get('/:bookId/file-url', fileUrlLimiter, BooksController.getDownloadUrl)

export default router
