import api from '../../../services/api.js'

export const AnnotationsService = {
  // Highlights
  async listHighlights(bookId) {
    const { data } = await api.get(`/api/v1/books/${bookId}/highlights`)
    return data.highlights || []
  },
  async createHighlight(bookId, payload) {
    const { data } = await api.post(`/api/v1/books/${bookId}/highlights`, payload)
    return data
  },
  async updateHighlight(highlightId, payload) {
    const { data } = await api.patch(`/api/v1/highlights/${highlightId}`, payload)
    return data
  },
  async deleteHighlight(highlightId) {
    const { data } = await api.delete(`/api/v1/highlights/${highlightId}`)
    return data
  },

  // Bookmarks
  async listBookmarks(bookId) {
    const { data } = await api.get(`/api/v1/books/${bookId}/bookmarks`)
    return data.bookmarks || []
  },
  async createBookmark(bookId, payload) {
    const { data } = await api.post(`/api/v1/books/${bookId}/bookmarks`, payload)
    return data
  },
  async updateBookmark(bookmarkId, payload) {
    const { data } = await api.patch(`/api/v1/bookmarks/${bookmarkId}`, payload)
    return data
  },
  async deleteBookmark(bookmarkId) {
    const { data } = await api.delete(`/api/v1/bookmarks/${bookmarkId}`)
    return data
  },

  // Reading Notes
  async listNotes(bookId, search) {
    const { data } = await api.get(`/api/v1/books/${bookId}/notes`, {
      params: search ? { search } : undefined,
    })
    return data.notes || []
  },
  async createNote(bookId, payload) {
    const { data } = await api.post(`/api/v1/books/${bookId}/notes`, payload)
    return data
  },
  async updateNote(noteId, payload) {
    const { data } = await api.patch(`/api/v1/notes/${noteId}`, payload)
    return data
  },
  async deleteNote(noteId) {
    const { data } = await api.delete(`/api/v1/notes/${noteId}`)
    return data
  },
}
