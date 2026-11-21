import api from '../../../services/api.js'

export const BooksService = {
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
   * Update book metadata.
   */
  async updateBook(bookId, payload) {
    const { data } = await api.patch(`/api/v1/books/${bookId}`, payload)
    return data.book
  },

  /**
   * Delete book.
   */
  async deleteBook(bookId) {
    const { data } = await api.delete(`/api/v1/books/${bookId}`)
    return data
  },

  /**
   * Get temporary signed download URL for original PDF.
   */
  async getDownloadUrl(bookId) {
    const { data } = await api.get(`/api/v1/books/${bookId}/download-url`)
    return data
  },
}
