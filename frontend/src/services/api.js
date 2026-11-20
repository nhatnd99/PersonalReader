/**
 * Centralized Axios instance with automatic token refresh queueing.
 */
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  withCredentials: true,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach access token and fallback refresh token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rf_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Cross-domain fallback header for refresh token
  const refreshToken = localStorage.getItem('rf_refresh_token')
  if (refreshToken && config.url?.includes('/auth/refresh')) {
    config.headers['X-Refresh-Token'] = refreshToken
  }

  return config
})

// Refresh queue handling to prevent concurrent refresh storms
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Global response interceptor for 401 handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (!error.response || error.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // Do not attempt refresh on auth endpoints (avoids infinite loop)
    if (
      originalRequest.url?.includes('/api/v1/auth/login') ||
      originalRequest.url?.includes('/api/v1/auth/register') ||
      originalRequest.url?.includes('/api/v1/auth/refresh')
    ) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
        .catch((err) => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const fallbackRefresh = localStorage.getItem('rf_refresh_token')
      const { data } = await api.post('/api/v1/auth/refresh', {
        refreshToken: fallbackRefresh || undefined,
      })

      const newAccessToken = data.accessToken
      localStorage.setItem('rf_access_token', newAccessToken)
      if (data.refreshToken) {
        localStorage.setItem('rf_refresh_token', data.refreshToken)
      }

      api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`
      processQueue(null, newAccessToken)

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return api(originalRequest)
    } catch (refreshErr) {
      processQueue(refreshErr, null)
      localStorage.removeItem('rf_access_token')
      localStorage.removeItem('rf_refresh_token')
      window.dispatchEvent(new Event('readflow:auth:session_expired'))
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  }
)

export default api
