/**
 * Local development server.
 * Uses app.listen() – NOT used in Vercel production.
 */
import app from './app.js'

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`[ReadFlow API] Development server running on http://localhost:${PORT}`)
})
