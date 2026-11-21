/**
 * CORS configuration.
 * Reads allowed origins from FRONTEND_ORIGINS env variable.
 * Automatically supports:
 * 1. Specific origins listed in FRONTEND_ORIGINS (comma-separated).
 * 2. All Vercel deployment/preview domains for this project (*.vercel.app).
 * 3. Localhost development origins (localhost, 127.0.0.1).
 */
const rawOrigins = process.env.FRONTEND_ORIGINS || 'http://localhost:5173'
const allowedOrigins = rawOrigins
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean)

export function isOriginAllowed(origin) {
  // Allow requests with no origin (direct browser visits, curl, health checks)
  if (!origin) return true

  const normalized = origin.replace(/\/+$/, '')

  // 1. Exact match in configured allowlist
  if (allowedOrigins.includes(normalized)) {
    return true
  }

  // 2. Wildcard allowlist support
  if (allowedOrigins.includes('*')) {
    return true
  }

  // 3. Localhost / 127.0.0.1 for local development
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) {
    return true
  }

  // 4. Any Vercel deployment domain for personal-reader or readflow (production or preview)
  // e.g. https://personal-reader-ql2qcfb64-nhatnd0909s-projects.vercel.app
  if (/^https:\/\/(personal-reader|readflow)[a-z0-9-]*\.vercel\.app$/i.test(normalized)) {
    return true
  }

  // 5. If any configured origin ends in .vercel.app, allow preview deployments under the same project
  const matchesVercelProject = allowedOrigins.some((ao) => {
    if (ao.endsWith('.vercel.app')) {
      const hostname = ao.replace(/^https?:\/\//, '').split('.')[0]
      const baseProject = hostname.split('-')[0]
      return (
        normalized.endsWith('.vercel.app') &&
        normalized.replace(/^https?:\/\//, '').startsWith(baseProject)
      )
    }
    return false
  })

  return matchesVercelProject
}

export const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
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
