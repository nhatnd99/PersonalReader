import api from '../../../services/api.js'

export const ReaderService = {
  async getReaderBundle(bookId) {
    const { data } = await api.get(`/api/v1/books/${bookId}/reader`)
    return data
  },

  async getPreferences() {
    const { data } = await api.get('/api/v1/users/me/reading-preferences')
    return data.preferences
  },

  async updatePreferences(preferences) {
    const { data } = await api.put('/api/v1/users/me/reading-preferences', preferences)
    return data.preferences
  },
}
