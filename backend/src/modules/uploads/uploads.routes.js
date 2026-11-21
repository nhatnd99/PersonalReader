import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { authenticate } from '../../middleware/auth.js'
import { UploadsController } from './uploads.controller.js'

const router = Router()

// Rate limiter for upload initialization (free-tier resource abuse protection)
const uploadInitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // max 50 initiate requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload sessions initiated. Please wait before creating more.' },
})

// All upload routes require authentication
router.use(authenticate)

router.post('/initiate', uploadInitLimiter, UploadsController.initiate)
router.post('/:uploadId/complete', UploadsController.complete)
router.get('/:uploadId', UploadsController.getStatus)
router.post('/:uploadId/refresh-url', UploadsController.refreshUrl)
router.post('/:uploadId/cancel', UploadsController.cancel)

export default router
