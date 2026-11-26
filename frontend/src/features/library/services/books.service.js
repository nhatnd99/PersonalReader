import api from '../../../services/api.js'

export const BooksService = {
  /**
   * Import a PDF directly via multipart/form-data for in-memory processing & HTML storage.
   */
  async importBook({ file, title, author, description, language, onUploadProgress, signal }) {
    const formData = new FormData()
    formData.append('file', file)
    if (title) formData.append('title', title)
    if (author) formData.append('author', author)
    if (description) formData.append('description', description)
    if (language) formData.append('language', language)

    const { data } = await api.post('/api/v1/books/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000, // Allow up to 2 minutes for in-memory extraction
      signal,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onUploadProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onUploadProgress(percent, progressEvent.loaded, progressEvent.total)
        }
      },
    })
    return data
  },

  /**
   * Poll import job status.
   */
  async getImportJob(jobId) {
    const { data } = await api.get(`/api/v1/books/import/${jobId}`)
    return data.job
  },

  /**
   * Cancel an active import job.
   */
  async cancelImportJob(jobId) {
    const { data } = await api.post(`/api/v1/books/import/${jobId}/cancel`)
    return data
  },

  /**
   * List books with pagination, search, and sorting.
   */
  async listBooks(params = {}) {
    const { data } = await api.get('/api/v1/books', { params })
    return data
  },

  /**
   * Get single book details.
   */
  async getBook(bookId) {
    const { data } = await api.get(`/api/v1/books/${bookId}`)
    return data.book
  },

  /**
   * Get ordered structured HTML chunks for a book.
   */
  async getBookContents(bookId, params = {}) {
    const { data } = await api.get(`/api/v1/books/${bookId}/contents`, { params })
    return data
  },

  /**
   * Get detected chapters for a book.
   */
  async getBookChapters(bookId) {
    const { data } = await api.get(`/api/v1/books/${bookId}/chapters`)
    return data.chapters
  },

  /**
   * Update book metadata.
   */
  async updateBook(bookId, payload) {
    const { data } = await api.patch(`/api/v1/books/${bookId}`, payload)
    return data.book
  },

  /**
   * Delete book and associated HTML content.
   */
  async deleteBook(bookId) {
    const { data } = await api.delete(`/api/v1/books/${bookId}`)
    return data
  },
}
