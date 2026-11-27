import { useState, useEffect, useRef, useCallback } from 'react'
import { ReaderService } from '../services/readerService.js'

const LOCAL_PREFS_KEY = 'rf_reader_preferences'

const DEFAULT_PREFS = {
  fontSize: 18,
  fontFamily: 'serif',
  lineHeight: 1.75,
  contentWidth: 720,
  theme: 'light',
}

export function useReaderSettings(initialPreferences) {
  const [preferences, setPreferences] = useState(() => {
    try {
      const cached = localStorage.getItem(LOCAL_PREFS_KEY)
      if (cached) return { ...DEFAULT_PREFS, ...JSON.parse(cached) }
    } catch (_) {}
    return DEFAULT_PREFS
  })

  const saveTimerRef = useRef(null)

  useEffect(() => {
    if (initialPreferences) {
      const merged = { ...DEFAULT_PREFS, ...initialPreferences }
      setPreferences(merged)
      try {
        localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(merged))
      } catch (_) {}
    }
  }, [initialPreferences])

  const updatePreference = useCallback((patch) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(next))
      } catch (_) {}

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        ReaderService.updatePreferences(next).catch(() => {
          // Keep local preference even if offline
        })
      }, 600)

      return next
    })
  }, [])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  return { preferences, updatePreference }
}
