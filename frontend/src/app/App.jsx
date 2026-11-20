import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// Lazy-loaded pages (populated in later phases)
const HomePage = lazy(() => import('../features/auth/pages/HomePage.jsx'))
const NotFoundPage = lazy(() => import('./NotFoundPage.jsx'))

export default function App() {
  return (
    <Suspense fallback={<div className="app-loading">Loading…</div>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
