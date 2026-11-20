import React from 'react'
import { useAuth } from '../hooks/useAuth.js'

export default function HomePage() {
  const { user, logout } = useAuth()

  return (
    <div style={{ maxWidth: 720, margin: '3rem auto', padding: '0 1.5rem', fontFamily: 'sans-serif' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid #e0e0e0',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.8rem' }}>📚</span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>ReadFlow</h1>
        </div>
        <button
          onClick={logout}
          style={{
            padding: '0.5rem 1rem',
            background: '#fff',
            border: '1px solid #dadce0',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          Sign Out
        </button>
      </header>

      <main>
        <div
          style={{
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e8eaed',
            padding: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            Welcome back, {user?.displayName || 'Reader'}! 👋
          </h2>
          <p style={{ color: '#5f6368', fontSize: '0.95rem', margin: '0 0 1rem 0' }}>
            You are securely authenticated.
          </p>

          <div style={{ fontSize: '0.875rem', lineHeight: '1.7' }}>
            <div><strong>User ID:</strong> <code>{user?.id}</code></div>
            <div><strong>Email:</strong> {user?.email}</div>
            <div><strong>Status:</strong> {user?.isActive ? 'Active ✅' : 'Inactive'}</div>
          </div>
        </div>

        <section style={{ border: '1px dashed #c0c4cc', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#1a73e8' }}>
            📖 Personal Book Library
          </h3>
          <p style={{ color: '#5f6368', fontSize: '0.9rem', margin: 0 }}>
            Phase 1 Authentication & Database Architecture verified. Library & PDF Cloud Storage will be enabled in Phase 2.
          </p>
        </section>
      </main>
    </div>
  )
}
