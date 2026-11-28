import React, { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../features/auth/context/AuthContext.jsx'
import ProtectedRoute from '../components/ProtectedRoute.jsx'
import GuestRoute from '../components/GuestRoute.jsx'
import AppLayout from '../components/layout/AppLayout.jsx'

// Lazy-loaded pages
const HomePage = lazy(() => import('../features/auth/pages/HomePage.jsx'))
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage.jsx'))
const RegisterPage = lazy(() => import('../features/auth/pages/RegisterPage.jsx'))
const ComingSoonPage = lazy(() => import('../features/library/pages/ComingSoonPage.jsx'))
const ReaderPage = lazy(() => import('../features/reader/pages/ReaderPage.jsx'))
const VocabularyPage = lazy(() => import('../features/vocabulary/pages/VocabularyPage.jsx'))
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
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ComingSoonPage
                    title="Reading History"
                    icon="🕒"
                    description="Automatic reading progress and recently opened books will be available in Phase 3."
                  />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vocabulary"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <VocabularyPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ComingSoonPage
                    title="Settings"
                    icon="⚙️"
                    description="Reader theme, typography, and offline sync preferences will be added in upcoming phases."
                    showProfile
                  />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reader/:bookId"
            element={
              <ProtectedRoute>
                <ReaderPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}
