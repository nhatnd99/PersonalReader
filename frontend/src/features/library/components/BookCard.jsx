import React, { useState } from 'react'
import { formatBytes, formatDate } from '../utils/formatters.js'

export default function BookCard({ book, onDownload, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const file = book.files?.[0]

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: '10px',
        border: '1px solid #e5e7eb',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        position: 'relative',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
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
            }}
          >
            📕
          </div>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.25rem',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
              }}
              title="Book actions"
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
                    border: '1px solid #e5e7eb',
                    width: '140px',
                    zIndex: 20,
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onDownload(book)
                    }}
                    style={{
                      width: '100%',
                      padding: '0.6rem 1rem',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      color: '#374151',
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = '#f3f4f6')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
                  >
                    ⬇️ Download
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onEdit(book)
                    }}
                    style={{
                      width: '100%',
                      padding: '0.6rem 1rem',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      color: '#374151',
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = '#f3f4f6')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onDelete(book)
                    }}
                    style={{
                      width: '100%',
                      padding: '0.6rem 1rem',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      color: '#ef4444',
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = '#fef2f2')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
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
            color: '#111827',
            margin: '0 0 0.35rem 0',
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

        {book.author && (
          <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
            {book.author}
          </p>
        )}
      </div>

      <div
        style={{
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: '#9ca3af',
        }}
      >
        <span>{file ? formatBytes(file.fileSize) : '—'}</span>
        <span>{formatDate(book.createdAt)}</span>
      </div>
    </div>
  )
}
