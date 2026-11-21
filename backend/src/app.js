/**
 * Express application factory.
 * Stateless; compatible with serverless execution.
 */
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { rateLimit } from 'express-rate-limit'
import { corsOptions } from './config/cors.js'
import { errorHandler } from './middleware/errorHandler.js'
import healthRouter from './modules/health/health.routes.js'
import authRouter from './modules/auth/auth.routes.js'
import uploadsRouter from './modules/uploads/uploads.routes.js'
import booksRouter from './modules/books/books.routes.js'

const app = express()

// ─── Security headers ──────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)

// ─── CORS ──────────────────────────────────────────────────────────────────
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

// ─── Cookie & Body parsing ─────────────────────────────────────────────────
app.use(cookieParser())
app.use(express.json({ limit: '64kb' }))
app.use(express.urlencoded({ extended: true, limit: '64kb' }))

// ─── Logging ───────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'))
}

// ─── Global rate limiter (free-tier protection) ────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})
app.use(globalLimiter)

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/health', healthRouter)
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/uploads', uploadsRouter)
app.use('/api/v1/books', booksRouter)

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// ─── Error handler (must be last) ──────────────────────────────────────────
app.use(errorHandler)

export default app
