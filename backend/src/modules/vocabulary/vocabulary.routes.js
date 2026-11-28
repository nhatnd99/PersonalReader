import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { authenticate } from '../../middleware/auth.js'
import { VocabularyController } from './vocabulary.controller.js'

const router = Router()

const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many vocabulary lookup requests. Please wait a moment.' },
})

router.use(authenticate)

router.post('/lookup', lookupLimiter, VocabularyController.lookup)
router.get('/', VocabularyController.list)
router.get('/:entryId', VocabularyController.getById)
router.post('/', VocabularyController.create)
router.patch('/:entryId', VocabularyController.update)
router.delete('/:entryId', VocabularyController.delete)

export default router
