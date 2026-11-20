import React, { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../features/auth/context/AuthContext.jsx'
import ProtectedRoute from '../components/ProtectedRoute.jsx'
import GuestRoute from '../components/GuestRoute.jsx'

// Lazy-loaded pages
const HomePage = lazy(() => import('../features/auth/pages/HomePage.jsx'))
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage.jsx'))
const RegisterPage = lazy(() => import('../features/auth/pages/RegisterPage.jsx'))
const NotFoundPage = lazy(() => import('./NotFoundPage.jsx'))

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<div className="app-loading">Loading…</div>}>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}
