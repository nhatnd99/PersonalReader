import React from 'react'
import { useAuth } from '../hooks/useAuth.js'
import LibraryView from '../../library/pages/LibraryView.jsx'

export default function HomePage() {
  const { user, logout } = useAuth()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* App Header */}
      <header
        style={{
          backgroundColor: '#fff',
          borderBottom: '1px solid #e5e7eb',
          padding: '0.875rem 1.5rem',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: '1080px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.6rem' }}>📚</span>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#111827', letterSpacing: '-0.02em' }}>
                ReadFlow
              </h1>
              <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>
                PDF Reader & Vocabulary Learning
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#4b5563' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#dbeafe',
                  color: '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
              </div>
              <span style={{ fontWeight: 600 }}>{user?.displayName || 'Reader'}</span>
            </div>

            <button
              onClick={logout}
              style={{
                padding: '0.45rem 0.85rem',
                background: '#fff',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#4b5563',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1080px', margin: '0 auto', padding: '1.5rem 1.5rem 3rem' }}>
        <LibraryView />
      </main>
    </div>
  )
}
