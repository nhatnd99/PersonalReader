import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth.js'

export default function ComingSoonPage({ title, icon, description, showProfile = false }) {
  const { user } = useAuth()

  return (
    <div style={{ maxWidth: '640px', margin: '1rem auto' }}>
      {showProfile && user && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '1.25rem',
            marginBottom: '1.25rem',
          }}
        >
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.75rem 0' }}>
            Account Profile
          </h2>
          <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.7 }}>
            <div><strong>Name:</strong> {user.displayName}</div>
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Status:</strong> {user.isActive ? 'Active' : 'Inactive'}</div>
          </div>
        </div>
      )}

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '3rem 1.5rem',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '2.75rem', display: 'block', marginBottom: '0.75rem' }}>{icon}</span>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
          {title} — Coming Soon
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 auto 1.5rem', maxWidth: '420px' }}>
          {description}
        </p>
        <Link to="/" className="rf-btn-primary" style={{ textDecoration: 'none' }}>
          Back to My Library
        </Link>
      </div>
    </div>
  )
}
