import api from '../../../services/api.js'

export const TocService = {
  async getToc(bookId) {
    const { data } = await api.get(`/api/v1/books/${bookId}/toc`)
    return data
  },

  async createEntry(bookId, payload) {
    const { data } = await api.post(`/api/v1/books/${bookId}/toc`, payload)
    return data
  },

  async updateEntry(bookId, entryId, payload) {
    const { data } = await api.patch(`/api/v1/books/${bookId}/toc/${entryId}`, payload)
    return data
  },

  async deleteEntry(bookId, entryId) {
    const { data } = await api.delete(`/api/v1/books/${bookId}/toc/${entryId}`)
    return data
  },

  async reorder(bookId, items) {
    const { data } = await api.patch(`/api/v1/books/${bookId}/toc/reorder`, { items })
    return data
  },

  async resetToAuto(bookId) {
    const { data } = await api.post(`/api/v1/books/${bookId}/toc/reset`)
    return data
  },
}
