import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { AuthController } from './auth.controller.js'
import { authenticate } from '../../middleware/auth.js'

const router = Router()

// Strict rate limiter for sensitive authentication endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
})

router.post('/register', authLimiter, AuthController.register)
router.post('/login', authLimiter, AuthController.login)
router.post('/refresh', AuthController.refresh)
router.post('/logout', AuthController.logout)
router.get('/me', authenticate, AuthController.me)

export default router
