/**
 * Global Express error handler.
 * Returns consistent JSON error responses.
 */
export function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message || 'Internal server error'

  if (status >= 500) {
    console.error('[ERROR]', err)
  }

  res.status(status).json({ error: message })
}
