import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { ReaderController } from '../reader/reader.controller.js'

const router = Router()

router.use(authenticate)

router.get('/me/reading-preferences', ReaderController.getPreferences)
router.put('/me/reading-preferences', ReaderController.upsertPreferences)

export default router
