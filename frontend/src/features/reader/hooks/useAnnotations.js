import { useState, useEffect, useCallback } from 'react'
import { AnnotationsService } from '../services/annotationsService.js'

export function useAnnotations(bookId) {
  const [highlights, setHighlights] = useState([])
  const [bookmarks, setBookmarks] = useState([])
  const [notes, setNotes] = useState([])
  const [annotationsVersion, setAnnotationsVersion] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  const refreshAnnotations = useCallback(async () => {
    if (!bookId) return
    setIsLoading(true)
    try {
      const [hl, bm, nt] = await Promise.all([
        AnnotationsService.listHighlights(bookId),
        AnnotationsService.listBookmarks(bookId),
        AnnotationsService.listNotes(bookId),
      ])
      setHighlights(hl)
      setBookmarks(bm)
      setNotes(nt)
    } catch (_) {
      // Keep existing state on transient error
    } finally {
      setIsLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    refreshAnnotations()
  }, [refreshAnnotations])

  const createHighlight = useCallback(
    async (payload) => {
      const res = await AnnotationsService.createHighlight(bookId, payload)
      setHighlights((prev) => [...prev, res.highlight])
      if (res.annotationsVersion) setAnnotationsVersion(res.annotationsVersion)
      return res.highlight
    },
    [bookId]
  )

  const updateHighlightColor = useCallback(async (highlightId, color) => {
    const res = await AnnotationsService.updateHighlight(highlightId, { color })
    setHighlights((prev) => prev.map((h) => (h.id === highlightId ? res.highlight : h)))
    if (res.annotationsVersion) setAnnotationsVersion(res.annotationsVersion)
    return res.highlight
  }, [])

  const deleteHighlight = useCallback(async (highlightId) => {
    const res = await AnnotationsService.deleteHighlight(highlightId)
    setHighlights((prev) => prev.filter((h) => h.id !== highlightId))
    if (res.annotationsVersion) setAnnotationsVersion(res.annotationsVersion)
  }, [])

  const createBookmark = useCallback(
    async (payload) => {
      const res = await AnnotationsService.createBookmark(bookId, payload)
      setBookmarks((prev) => [res.bookmark, ...prev])
      if (res.annotationsVersion) setAnnotationsVersion(res.annotationsVersion)
      return res.bookmark
    },
    [bookId]
  )

  const updateBookmark = useCallback(async (bookmarkId, payload) => {
    const res = await AnnotationsService.updateBookmark(bookmarkId, payload)
    setBookmarks((prev) => prev.map((b) => (b.id === bookmarkId ? res.bookmark : b)))
    if (res.annotationsVersion) setAnnotationsVersion(res.annotationsVersion)
    return res.bookmark
  }, [])

  const deleteBookmark = useCallback(async (bookmarkId) => {
    const res = await AnnotationsService.deleteBookmark(bookmarkId)
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId))
    if (res.annotationsVersion) setAnnotationsVersion(res.annotationsVersion)
  }, [])

  const createNote = useCallback(
    async (payload) => {
      const res = await AnnotationsService.createNote(bookId, payload)
      setNotes((prev) => [res.note, ...prev])
      if (res.annotationsVersion) setAnnotationsVersion(res.annotationsVersion)
      return res.note
    },
    [bookId]
  )

  const updateNote = useCallback(async (noteId, payload) => {
    const res = await AnnotationsService.updateNote(noteId, payload)
    setNotes((prev) => prev.map((n) => (n.id === noteId ? res.note : n)))
    if (res.annotationsVersion) setAnnotationsVersion(res.annotationsVersion)
    return res.note
  }, [])

  const deleteNote = useCallback(async (noteId) => {
    const res = await AnnotationsService.deleteNote(noteId)
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
    if (res.annotationsVersion) setAnnotationsVersion(res.annotationsVersion)
  }, [])

  return {
    highlights,
    bookmarks,
    notes,
    annotationsVersion,
    setAnnotationsVersion,
    isLoading,
    refreshAnnotations,
    createHighlight,
    updateHighlightColor,
    deleteHighlight,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    createNote,
    updateNote,
    deleteNote,
  }
}
