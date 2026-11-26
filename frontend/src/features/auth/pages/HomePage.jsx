import React from 'react'
import { useAuth } from '../hooks/useAuth.js'
import LibraryView from '../../library/pages/LibraryView.jsx'
import '../../library/styles/library.css'

export default function HomePage() {
  const { user, logout } = useAuth()

  return (
    <div className="rf-app-shell">
      <header className="rf-header">
        <div className="rf-header-inner">
          <div className="rf-brand">
            <span style={{ fontSize: '1.6rem' }}>📚</span>
            <div>
              <h1 className="rf-brand-title">ReadFlow</h1>
              <span className="rf-brand-subtitle">
                Personal PDF Library
              </span>
            </div>
          </div>

          <div className="rf-user-actions">
            <div className="rf-user-badge">
              <div className="rf-avatar">
                {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
              </div>
              <span className="rf-user-name">{user?.displayName || 'Reader'}</span>
            </div>

            <button
              type="button"
              className="rf-btn-signout"
              onClick={logout}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="rf-main">
        <LibraryView />
      </main>
    </div>
  )
}
