import api from '../../../services/api.js'

export const ProgressService = {
  async getProgress(bookId) {
    const { data } = await api.get(`/api/v1/books/${bookId}/progress`)
    return data.progress
  },

  async saveProgress(bookId, payload) {
    const { data } = await api.put(`/api/v1/books/${bookId}/progress`, payload)
    return data
  },

  async getSyncState(bookId) {
    const { data } = await api.get(`/api/v1/books/${bookId}/sync-state`)
    return data
  },

  async issueSyncToken() {
    const { data } = await api.post('/api/v1/sync/token')
    return data
  },
}
