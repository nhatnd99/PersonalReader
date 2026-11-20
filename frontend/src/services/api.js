/**
 * Axios instance configured for the ReadFlow backend.
 * Uses VITE_API_BASE_URL from environment (never expose secrets here).
 */
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  withCredentials: true,
  timeout: 30_000,
})

// Attach JWT from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rf_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global error normalisation
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    if (status === 401) {
      localStorage.removeItem('rf_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
