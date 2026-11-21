/**
 * CORS configuration.
 * Reads allowed origins from FRONTEND_ORIGINS env variable.
 * Never hardcode production domains here – use environment variables.
 */
const rawOrigins = process.env.FRONTEND_ORIGINS || 'http://localhost:5173'
const allowedOrigins = rawOrigins
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean)

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., direct browser visits, curl, Postman, health checks)
    if (!origin) {
      return callback(null, true)
    }

    const normalizedOrigin = origin.replace(/\/+$/, '')
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true)
    }

    const error = new Error(`CORS: origin ${origin} not allowed`)
    error.status = 403
    callback(error)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token'],
  exposedHeaders: ['Set-Cookie'],
}
