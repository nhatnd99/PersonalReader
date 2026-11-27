import { useState, useEffect, useRef, useCallback } from 'react'
import { ProgressService } from '../services/progressService.js'

/**
 * Real-time synchronization hook.
 * Connects via Ably SSE (when ABLY_API_KEY is configured on backend) or falls back
 * transparently to version-based polling. Never force-scrolls the active reader.
 */
export function useRealtimeSync({
  bookId,
  deviceId,
  localRevision,
  localTocVersion,
  onRemoteProgress,
  onRemoteTocChange,
}) {
  const [syncStatus, setSyncStatus] = useState(() => (navigator.onLine ? 'synced' : 'offline'))
  const [syncProvider, setSyncProvider] = useState('polling')
  const [remoteUpdate, setRemoteUpdate] = useState(null)

  const localRevisionRef = useRef(localRevision || 0)
  const localTocVersionRef = useRef(localTocVersion || 1)

  useEffect(() => {
    localRevisionRef.current = localRevision || 0
  }, [localRevision])

  useEffect(() => {
    localTocVersionRef.current = localTocVersion || 1
  }, [localTocVersion])

  const handleServerSyncState = useCallback(
    (state) => {
      if (!state) return

      if (typeof state.tocVersion === 'number' && state.tocVersion > localTocVersionRef.current) {
        localTocVersionRef.current = state.tocVersion
        if (onRemoteTocChange) onRemoteTocChange()
      }

      const remoteProg = state.progress
      if (
        remoteProg &&
        remoteProg.revision > localRevisionRef.current &&
        remoteProg.lastDeviceId !== deviceId
      ) {
        localRevisionRef.current = remoteProg.revision
        setRemoteUpdate(remoteProg)
        if (onRemoteProgress) onRemoteProgress(remoteProg)
      }
    },
    [deviceId, onRemoteProgress, onRemoteTocChange]
  )

  const syncNow = useCallback(async () => {
    if (!bookId || !navigator.onLine) {
      setSyncStatus('offline')
      return
    }
    try {
      const state = await ProgressService.getSyncState(bookId)
      handleServerSyncState(state)
      setSyncStatus('synced')
    } catch (_) {
      setSyncStatus('error')
    }
  }, [bookId, handleServerSyncState])

  useEffect(() => {
    if (!bookId) return

    let pollTimer = null
    let eventSource = null
    let cancelled = false

    const startPolling = (intervalMs = 4000) => {
      setSyncProvider('polling')
      pollTimer = setInterval(() => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          syncNow()
        }
      }, intervalMs)
    }

    const initSync = async () => {
      if (!navigator.onLine) {
        setSyncStatus('offline')
        return
      }

      try {
        const tokenInfo = await ProgressService.issueSyncToken()
        if (cancelled) return

        if (tokenInfo.provider === 'ably' && tokenInfo.tokenRequest) {
          // Exchange short-lived TokenRequest for an Ably access token and open native EventSource SSE
          const keyName = tokenInfo.tokenRequest.keyName
          const tokenRes = await fetch(`https://rest.ably.io/keys/${encodeURIComponent(keyName)}/requestToken`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tokenInfo.tokenRequest),
          })

          if (tokenRes.ok) {
            const { token } = await tokenRes.json()
            const channel = encodeURIComponent(`${tokenInfo.channelPrefix}:book:${bookId}`)
            eventSource = new EventSource(
              `https://realtime.ably.io/event-stream?channels=${channel}&v=1.2&accessToken=${encodeURIComponent(token)}`
            )
            setSyncProvider('ably')

            eventSource.onmessage = (evt) => {
              try {
                const msg = JSON.parse(evt.data)
                const payload = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data
                if (msg.name === 'progress:updated' && payload?.progress) {
                  handleServerSyncState({ progress: payload.progress })
                } else if (msg.name === 'toc:updated' && payload?.tocVersion) {
                  handleServerSyncState({ tocVersion: payload.tocVersion })
                }
              } catch (_) {}
            }

            eventSource.onerror = () => {
              if (eventSource) {
                eventSource.close()
                eventSource = null
              }
              if (!cancelled && !pollTimer) startPolling(5000)
            }
            return
          }
        }

        startPolling(tokenInfo.pollIntervalMs || 4000)
      } catch (_) {
        if (!cancelled) startPolling(5000)
      }
    }

    initSync()

    const handleOnline = () => {
      setSyncStatus('syncing')
      syncNow()
    }
    const handleOffline = () => setSyncStatus('offline')

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      cancelled = true
      if (pollTimer) clearInterval(pollTimer)
      if (eventSource) eventSource.close()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [bookId, handleServerSyncState, syncNow])

  return {
    syncStatus,
    setSyncStatus,
    syncProvider,
    remoteUpdate,
    dismissRemoteUpdate: () => setRemoteUpdate(null),
    syncNow,
  }
}
