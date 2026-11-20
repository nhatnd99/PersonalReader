import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../features/auth/hooks/useAuth.js'

export default function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <div className="app-loading">Loading…</div>
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}
