/**
 * Real-Time Synchronization Provider Abstraction.
 * Supports Ably (serverless-compatible WebSocket pub/sub via TokenRequest + REST publish)
 * with graceful fallback to version-based polling when ABLY_API_KEY is not configured.
 */
import crypto from 'node:crypto'

export class RealtimeSyncService {
  static isAblyConfigured() {
    const key = process.env.ABLY_API_KEY
    return Boolean(key && key.includes(':'))
  }

  /**
   * Issues a short-lived, capability-scoped Ably TokenRequest for the authenticated user,
   * or instructs the client to use version-based polling fallback.
   * Never exposes ABLY_API_KEY to the frontend.
   */
  static async issueClientToken(userId) {
    const channelPrefix = `user:${userId}`

    if (!this.isAblyConfigured()) {
      return {
        provider: 'polling',
        pollIntervalMs: 4000,
        channelPrefix,
      }
    }

    const [keyName, keySecret] = process.env.ABLY_API_KEY.split(':')
    const timestamp = Date.now()
    const nonce = crypto.randomBytes(12).toString('hex')
    const ttl = 60 * 60 * 1000 // 1 hour
    const capability = JSON.stringify({
      [`${channelPrefix}:*`]: ['subscribe', 'presence'],
    })

    // Ably TokenRequest MAC signing order: keyName, ttl, capability, clientId, timestamp, nonce
    const signText = [keyName, ttl, capability, userId, timestamp, nonce, ''].join('\n')
    const mac = crypto.createHmac('sha256', keySecret).update(signText).digest('base64')

    return {
      provider: 'ably',
      channelPrefix,
      tokenRequest: {
        keyName,
        ttl,
        capability,
        clientId: userId,
        timestamp,
        nonce,
        mac,
      },
    }
  }

  /**
   * Publishes a validated state change to the user's private book channel via Ably REST API.
   */
  static async publishBookSyncEvent({ userId, bookId, eventName, payload }) {
    if (!this.isAblyConfigured()) {
      return { published: false, provider: 'polling' }
    }

    const channelName = encodeURIComponent(`user:${userId}:book:${bookId}`)
    const authHeader = Buffer.from(process.env.ABLY_API_KEY).toString('base64')

    try {
      const res = await fetch(`https://rest.ably.io/channels/${channelName}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: eventName,
          data: payload,
        }),
      })

      if (!res.ok) {
        console.warn(`[RealtimeSync] Ably publish returned ${res.status}`)
        return { published: false, provider: 'ably' }
      }

      return { published: true, provider: 'ably' }
    } catch (err) {
      console.warn('[RealtimeSync] Ably publish error:', err.message)
      return { published: false, provider: 'ably' }
    }
  }
}
