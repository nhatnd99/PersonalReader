/**
 * JWT authentication middleware.
 * Verifies access tokens and attaches authenticated user context to req.user.
 */
import jwt from 'jsonwebtoken'

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'rf_default_dev_secret_32_chars_min!'

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Missing or malformed authorization header.',
    })
  }

  const token = authHeader.slice(7).trim()

  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET)

    if (payload.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token type.' })
    }

    req.user = payload
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ error: 'Invalid or revoked token.' })
  }
}

/**
 * Authorization helper: Verifies that the requested resource belongs to the current user.
 */
export function authorizeOwner(resourceUserId, currentUserId) {
  if (!resourceUserId || !currentUserId || resourceUserId !== currentUserId) {
    const error = new Error('Access denied: You do not own this resource.')
    error.status = 403
    throw error
  }
}
