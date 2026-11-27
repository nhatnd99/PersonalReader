/**
 * Calculates content-weighted reading percentage and manages per-session device IDs.
 */

export function calculateReadingPercentage(contents = [], currentSequence = 1, ratioWithinChunk = 0) {
  if (!contents || contents.length === 0) return 0

  const totalWords = contents.reduce((sum, c) => sum + Math.max(1, c.wordCount || 1), 0)
  if (totalWords <= 0) return 0

  let wordsBefore = 0
  let currentChunkWords = 0

  for (const chunk of contents) {
    const w = Math.max(1, chunk.wordCount || 1)
    if (chunk.sequence < currentSequence) {
      wordsBefore += w
    } else if (chunk.sequence === currentSequence) {
      currentChunkWords = w
      break
    }
  }

  const clampedRatio = Math.min(1, Math.max(0, ratioWithinChunk))
  const effectiveWords = wordsBefore + currentChunkWords * clampedRatio
  const pct = (effectiveWords / totalWords) * 100
  return Math.min(100, Math.max(0, Math.round(pct * 10) / 10))
}

export function getOrCreateDeviceId() {
  const key = 'rf_session_device_id'
  try {
    let id = sessionStorage.getItem(key)
    if (!id) {
      id = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
      sessionStorage.setItem(key, id)
    }
    return id
  } catch (_) {
    return `dev_${Math.random().toString(36).slice(2, 10)}`
  }
}
