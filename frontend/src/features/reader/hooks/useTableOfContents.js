import { useState, useMemo, useCallback, useEffect } from 'react'
import { TocService } from '../services/tocService.js'
import { buildTocTree } from '../utils/tocGenerator.js'

export function useTableOfContents(bookId, initialEntries = [], initialTocVersion = 1) {
  const [entries, setEntries] = useState(initialEntries)
  const [tocVersion, setTocVersion] = useState(initialTocVersion)
  const [activeEntryId, setActiveEntryId] = useState(null)
  const [tocError, setTocError] = useState('')
  const [isMutating, setIsMutating] = useState(false)

  useEffect(() => {
    setEntries(initialEntries || [])
  }, [initialEntries])

  useEffect(() => {
    setTocVersion(initialTocVersion || 1)
  }, [initialTocVersion])

  const tree = useMemo(() => buildTocTree(entries), [entries])

  const refreshToc = useCallback(async () => {
    if (!bookId) return
    try {
      const data = await TocService.getToc(bookId)
      setEntries(data.entries || [])
      setTocVersion(data.tocVersion || 1)
    } catch (_) {}
  }, [bookId])

  const createEntry = useCallback(
    async (payload) => {
      setIsMutating(true)
      setTocError('')
      try {
        const res = await TocService.createEntry(bookId, payload)
        setEntries((prev) => [...prev, res.entry])
        setTocVersion(res.tocVersion)
        return res.entry
      } catch (err) {
        setTocError(err.response?.data?.error || 'Failed to add TOC entry.')
        throw err
      } finally {
        setIsMutating(false)
      }
    },
    [bookId]
  )

  const updateEntry = useCallback(
    async (entryId, payload) => {
      setIsMutating(true)
      setTocError('')
      try {
        const res = await TocService.updateEntry(bookId, entryId, payload)
        setEntries((prev) => prev.map((e) => (e.id === entryId ? res.entry : e)))
        setTocVersion(res.tocVersion)
        return res.entry
      } catch (err) {
        setTocError(err.response?.data?.error || 'Failed to update TOC entry.')
        throw err
      } finally {
        setIsMutating(false)
      }
    },
    [bookId]
  )

  const deleteEntry = useCallback(
    async (entryId) => {
      setIsMutating(true)
      setTocError('')
      try {
        const res = await TocService.deleteEntry(bookId, entryId)
        // Refresh full list so cascaded children are removed cleanly
        await refreshToc()
        setTocVersion(res.tocVersion)
      } catch (err) {
        setTocError(err.response?.data?.error || 'Failed to delete TOC entry.')
        throw err
      } finally {
        setIsMutating(false)
      }
    },
    [bookId, refreshToc]
  )

  const moveEntry = useCallback(
    async (entryId, direction) => {
      const idx = entries.findIndex((e) => e.id === entryId)
      if (idx < 0) return
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= entries.length) return

      const reordered = [...entries]
      const [moved] = reordered.splice(idx, 1)
      reordered.splice(targetIdx, 0, moved)

      const items = reordered.map((e, i) => ({
        id: e.id,
        parentId: e.parentId,
        position: i,
        level: e.level,
      }))

      setIsMutating(true)
      setTocError('')
      try {
        const res = await TocService.reorder(bookId, items)
        setEntries(res.entries || [])
        setTocVersion(res.tocVersion)
      } catch (err) {
        setTocError(err.response?.data?.error || 'Failed to reorder TOC.')
      } finally {
        setIsMutating(false)
      }
    },
    [bookId, entries]
  )

  const resetToAuto = useCallback(async () => {
    setIsMutating(true)
    setTocError('')
    try {
      const res = await TocService.resetToAuto(bookId)
      setEntries(res.entries || [])
      setTocVersion(res.tocVersion)
    } catch (err) {
      setTocError(err.response?.data?.error || 'Failed to reset TOC.')
    } finally {
      setIsMutating(false)
    }
  }, [bookId])

  return {
    entries,
    tree,
    tocVersion,
    activeEntryId,
    setActiveEntryId,
    tocError,
    isMutating,
    refreshToc,
    createEntry,
    updateEntry,
    deleteEntry,
    moveEntry,
    resetToAuto,
  }
}
