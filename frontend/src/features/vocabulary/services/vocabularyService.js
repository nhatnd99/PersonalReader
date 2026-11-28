import api from '../../../services/api.js'

export const VocabularyService = {
  async lookup(payload) {
    const { data } = await api.post('/api/v1/vocabulary/lookup', payload)
    return data.lookup
  },

  async list(params = {}) {
    const { data } = await api.get('/api/v1/vocabulary', { params })
    return data
  },

  async getById(entryId) {
    const { data } = await api.get(`/api/v1/vocabulary/${entryId}`)
    return data.entry
  },

  async create(payload) {
    const { data } = await api.post('/api/v1/vocabulary', payload)
    return data.entry
  },

  async update(entryId, payload) {
    const { data } = await api.patch(`/api/v1/vocabulary/${entryId}`, payload)
    return data.entry
  },

  async remove(entryId) {
    const { data } = await api.delete(`/api/v1/vocabulary/${entryId}`)
    return data
  },
}
