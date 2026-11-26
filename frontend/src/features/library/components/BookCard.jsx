import React, { useState } from 'react'
import { formatBytes, formatDate } from '../utils/formatters.js'

export default function BookCard({ book, onSelect, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const file = book.files?.[0]
  const metaSummary = book.totalPages
    ? `${book.totalPages}p • ${(book.totalWords || 0).toLocaleString()}w`
    : file
    ? formatBytes(file.fileSize)
    : '—'

  return (
    <div
      className="rf-book-card"
      onClick={() => onSelect && onSelect(book)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect && onSelect(book)
        }
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                flexShrink: 0,
              }}
            >
              📕
            </div>
            <span className={`rf-badge ${book.status === 'ready' ? 'rf-badge-ready' : 'rf-badge-pending'}`}>
              {book.status === 'ready' ? 'Unread' : book.status}
            </span>
          </div>

          <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.25rem',
                cursor: 'pointer',
                color: '#64748b',
                minWidth: '36px',
                minHeight: '36px',
                borderRadius: '6px',
              }}
              title="Book actions"
              aria-label={`Actions for ${book.title}`}
            >
              ⋮
            </button>

            {menuOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                    border: '1px solid #e2e8f0',
                    width: '150px',
                    zIndex: 20,
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onSelect && onSelect(book)
                    }}
                    style={{
                      width: '100%',
                      padding: '0.65rem 1rem',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      color: '#334155',
                    }}
                  >
                    👁️ Details & Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onEdit(book)
                    }}
                    style={{
                      width: '100%',
                      padding: '0.65rem 1rem',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      color: '#334155',
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onDelete(book)
                    }}
                    style={{
                      width: '100%',
                      padding: '0.65rem 1rem',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      color: '#dc2626',
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <h3
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: '#0f172a',
            margin: '0 0 0.3rem 0',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.35,
          }}
          title={book.title}
        >
          {book.title}
        </h3>

        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.84rem', color: '#64748b', minHeight: '1.2rem' }}>
          {book.author || 'Unknown Author'}
        </p>
      </div>

      <div
        style={{
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: '#94a3b8',
        }}
      >
        <span>{metaSummary}</span>
        <span>{formatDate(book.createdAt)}</span>
      </div>
    </div>
  )
}
