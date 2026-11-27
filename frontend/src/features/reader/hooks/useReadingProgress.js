import { useState, useEffect, useRef, useCallback } from 'react'
import { ProgressService } from '../services/progressService.js'
import { calculateReadingPercentage } from '../utils/progressCalculator.js'

export function useReadingProgress({
  bookId,
  contents,
  tocEntries,
  initialProgress,
  deviceId,
  containerRef,
  onActiveTocChange,
  onSyncStateChange,
}) {
  const [progress, setProgress] = useState({
    currentBlockId: initialProgress?.currentBlockId || null,
    currentSequence: initialProgress?.currentSequence || 1,
    currentTocEntryId: initialProgress?.currentTocEntryId || null,
    scrollPercentage: initialProgress?.scrollPercentage || 0,
    readingPercentage: initialProgress?.readingPercentage || 0,
    revision: initialProgress?.revision || 0,
  })

  const latestProgressRef = useRef(progress)
  const lastSavedKeyRef = useRef('')
  const saveTimerRef = useRef(null)
  const isRestoringRef = useRef(false)

  useEffect(() => {
    if (initialProgress) {
      const next = {
        currentBlockId: initialProgress.currentBlockId || null,
        currentSequence: initialProgress.currentSequence || 1,
        currentTocEntryId: initialProgress.currentTocEntryId || null,
        scrollPercentage: initialProgress.scrollPercentage || 0,
        readingPercentage: initialProgress.readingPercentage || 0,
        revision: initialProgress.revision || 0,
      }
      setProgress(next)
      latestProgressRef.current = next
      lastSavedKeyRef.current = `${next.currentBlockId}:${next.readingPercentage}`
      if (next.currentTocEntryId && onActiveTocChange) {
        onActiveTocChange(next.currentTocEntryId)
      }
    }
  }, [initialProgress, onActiveTocChange])

  const persistProgress = useCallback(
    async (candidate) => {
      if (!bookId || !candidate) return
      const key = `${candidate.currentBlockId}:${candidate.readingPercentage}`
      if (key === lastSavedKeyRef.current) return

      if (onSyncStateChange) onSyncStateChange('syncing')
      try {
        const res = await ProgressService.saveProgress(bookId, {
          currentTocEntryId: candidate.currentTocEntryId,
          currentBlockId: candidate.currentBlockId,
          currentSequence: candidate.currentSequence,
          scrollPercentage: candidate.scrollPercentage,
          readingPercentage: candidate.readingPercentage,
          deviceId,
          clientRevision: candidate.revision > 0 ? candidate.revision : undefined,
        })

        if (res.progress) {
          lastSavedKeyRef.current = `${res.progress.currentBlockId}:${res.progress.readingPercentage}`
          latestProgressRef.current = {
            ...latestProgressRef.current,
            revision: res.progress.revision,
          }
          setProgress((prev) => ({ ...prev, revision: res.progress.revision }))
        }
        if (onSyncStateChange) onSyncStateChange(navigator.onLine ? 'synced' : 'offline')
      } catch (_) {
        if (onSyncStateChange) onSyncStateChange(navigator.onLine ? 'error' : 'offline')
      }
    },
    [bookId, deviceId, onSyncStateChange]
  )

  const scheduleSave = useCallback(
    (candidate) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        persistProgress(candidate)
      }, 1500)
    },
    [persistProgress]
  )

  // Scroll to a logical block ID or sequence (used for Resume Reading, TOC click, and Remote Jump)
  const scrollToLocation = useCallback(
    ({ blockId, anchorId, sequence, scrollPercentage }) => {
      const container = containerRef?.current
      if (!container) return false

      isRestoringRef.current = true
      setTimeout(() => {
        isRestoringRef.current = false
      }, 600)

      if (anchorId) {
        const el = container.querySelector(`[id="${anchorId}"]`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return true
        }
      }

      if (blockId) {
        const el = container.querySelector(`[data-block-id="${blockId}"]`)
        if (el) {
          el.scrollIntoView({ behavior: 'auto', block: 'start' })
          return true
        }
      }

      if (sequence) {
        const seqEl = container.querySelector(`[data-sequence="${sequence}"]`)
        if (seqEl) {
          seqEl.scrollIntoView({ behavior: 'auto', block: 'start' })
          return true
        }
      }

      if (typeof scrollPercentage === 'number' && scrollPercentage > 0) {
        const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)
        container.scrollTop = (scrollPercentage / 100) * maxScroll
        return true
      }

      return false
    },
    [containerRef]
  )

  // Restore saved position once content DOM has rendered
  useEffect(() => {
    if (!contents || contents.length === 0 || !initialProgress) return
    const timer = setTimeout(() => {
      scrollToLocation({
        blockId: initialProgress.currentBlockId,
        sequence: initialProgress.currentSequence,
        scrollPercentage: initialProgress.scrollPercentage,
      })
    }, 80)
    return () => clearTimeout(timer)
  }, [contents, initialProgress, scrollToLocation])

  // IntersectionObserver + throttled scroll listener for logical & scroll tracking
  useEffect(() => {
    const container = containerRef?.current
    if (!container || !contents || contents.length === 0) return

    const blocks = Array.from(container.querySelectorAll('[data-block-id]'))
    if (blocks.length === 0) return

    const findNearestTocEntry = (blockId, sequence) => {
      if (!tocEntries || tocEntries.length === 0) return null
      const exact = tocEntries.find((t) => t.contentBlockId === blockId)
      if (exact) return exact.id
      // Fallback: last TOC entry at or before current sequence
      let best = null
      for (const t of tocEntries) {
        if (t.contentSequence <= sequence) best = t.id
      }
      return best
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (isRestoringRef.current) return
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible.length === 0) return
        const topEl = visible[0].target
        const blockId = topEl.getAttribute('data-block-id')
        const sequence = parseInt(topEl.getAttribute('data-sequence') || '1', 10)

        const maxScroll = Math.max(1, container.scrollHeight - container.clientHeight)
        const scrollPct = Math.min(100, Math.max(0, Math.round((container.scrollTop / maxScroll) * 1000) / 10))
        const blockIdx = blocks.indexOf(topEl)
        const seqBlocks = blocks.filter((b) => parseInt(b.getAttribute('data-sequence') || '1', 10) === sequence)
        const posInSeq = Math.max(0, seqBlocks.indexOf(topEl))
        const ratioInChunk = seqBlocks.length > 1 ? posInSeq / (seqBlocks.length - 1) : scrollPct / 100
        const readingPct =
          scrollPct >= 98
            ? 100
            : calculateReadingPercentage(contents, sequence, ratioInChunk) || scrollPct

        const tocEntryId = findNearestTocEntry(blockId, sequence)
        if (tocEntryId && onActiveTocChange) {
          onActiveTocChange(tocEntryId)
        }

        const next = {
          currentBlockId: blockId,
          currentSequence: sequence,
          currentTocEntryId: tocEntryId,
          scrollPercentage: scrollPct,
          readingPercentage: Math.max(0, Math.min(100, blockIdx === blocks.length - 1 && scrollPct > 95 ? 100 : readingPct)),
          revision: latestProgressRef.current.revision,
        }

        latestProgressRef.current = next
        setProgress(next)
        scheduleSave(next)
      },
      {
        root: container,
        rootMargin: '-5% 0px -75% 0px',
        threshold: 0.01,
      }
    )

    blocks.forEach((el) => observer.observe(el))

    const handleVisibilityHide = () => {
      if (document.visibilityState === 'hidden') {
        persistProgress(latestProgressRef.current)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityHide)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityHide)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      persistProgress(latestProgressRef.current)
    }
  }, [contents, tocEntries, containerRef, onActiveTocChange, scheduleSave, persistProgress])

  return {
    progress,
    setProgress,
    scrollToLocation,
    forceSave: () => persistProgress(latestProgressRef.current),
  }
}
