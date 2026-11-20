import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../../../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initialize session on mount
  useEffect(() => {
    let isMounted = true

    async function initAuth() {
      const token = localStorage.getItem('rf_access_token')
      const refreshToken = localStorage.getItem('rf_refresh_token')

      if (!token && !refreshToken) {
        if (isMounted) setLoading(false)
        return
      }

      try {
        const { data } = await api.get('/api/v1/auth/me')
        if (isMounted) {
          setUser(data.user)
          setError(null)
        }
      } catch (err) {
        // If 401, axios interceptor already attempted refresh
        if (isMounted) {
          setUser(null)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initAuth()

    // Listen for session expiry from axios interceptor
    const handleSessionExpired = () => {
      setUser(null)
    }
    window.addEventListener('readflow:auth:session_expired', handleSessionExpired)

    return () => {
      isMounted = false
      window.removeEventListener('readflow:auth:session_expired', handleSessionExpired)
    }
  }, [])

  // Login handler
  const login = useCallback(async (email, password) => {
    setError(null)
    try {
      const { data } = await api.post('/api/v1/auth/login', { email, password })
      localStorage.setItem('rf_access_token', data.accessToken)
      if (data.refreshToken) {
        localStorage.setItem('rf_refresh_token', data.refreshToken)
      }
      setUser(data.user)
      return { success: true, user: data.user }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Login failed'
      setError(msg)
      return { success: false, error: msg }
    }
  }, [])

  // Register handler
  const register = useCallback(async (email, password, displayName) => {
    setError(null)
    try {
      const { data } = await api.post('/api/v1/auth/register', {
        email,
        password,
        displayName,
      })
      // Auto-login after registration
      return await login(email, password)
    } catch (err) {
      let msg = err.response?.data?.error
      if (err.response?.data?.details) {
        msg = err.response.data.details.map((d) => d.message).join('. ')
      }
      msg = msg || err.message || 'Registration failed'
      setError(msg)
      return { success: false, error: msg }
    }
  }, [login])

  // Logout handler
  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('rf_refresh_token')
    try {
      await api.post('/api/v1/auth/logout', { refreshToken })
    } catch {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('rf_access_token')
      localStorage.removeItem('rf_refresh_token')
      setUser(null)
      setError(null)
    }
  }, [])

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
