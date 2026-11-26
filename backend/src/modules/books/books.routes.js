import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { authenticate } from '../../middleware/auth.js'
import { BooksController } from './books.controller.js'

const router = Router()

const fileUrlLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many file URL requests. Please wait before trying again.' },
})

// All book endpoints require authentication
router.use(authenticate)

router.get('/', BooksController.list)
router.get('/:bookId', BooksController.getById)
router.patch('/:bookId', BooksController.update)
router.delete('/:bookId', BooksController.delete)
router.get('/:bookId/download-url', fileUrlLimiter, BooksController.getDownloadUrl)
router.get('/:bookId/file-url', fileUrlLimiter, BooksController.getDownloadUrl)

export default router
