import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { ReaderController } from '../reader/reader.controller.js'

const router = Router()

router.use(authenticate)

router.post('/token', ReaderController.issueSyncToken)

export default router
