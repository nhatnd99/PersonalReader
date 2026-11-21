import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { BooksController } from './books.controller.js'

const router = Router()

// All book endpoints require authentication
router.use(authenticate)

router.get('/', BooksController.list)
router.get('/:bookId', BooksController.getById)
router.patch('/:bookId', BooksController.update)
router.delete('/:bookId', BooksController.delete)
router.get('/:bookId/download-url', BooksController.getDownloadUrl)

export default router
