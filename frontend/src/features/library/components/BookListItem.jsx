import React from 'react'
import { formatBytes, formatDate } from '../utils/formatters.js'

export default function BookListItem({ book, onDownload, onEdit, onDelete }) {
  const file = book.files?.[0]

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        padding: '0.9rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.5rem',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0, marginRight: '1rem' }}>
        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>📕</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: '0.95rem',
              color: '#111827',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={book.title}
          >
            {book.title}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: '#6b7280', marginTop: '0.15rem' }}>
            {book.author && <span>{book.author}</span>}
            <span>•</span>
            <span>{file ? formatBytes(file.fileSize) : '—'}</span>
            <span>•</span>
            <span>{formatDate(book.createdAt)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <button
          onClick={() => onDownload(book)}
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: '#fff',
            cursor: 'pointer',
            fontSize: '0.8rem',
            color: '#374151',
          }}
          title="Download original PDF"
        >
          ⬇️
        </button>
        <button
          onClick={() => onEdit(book)}
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: '#fff',
            cursor: 'pointer',
            fontSize: '0.8rem',
            color: '#374151',
          }}
          title="Edit metadata"
        >
          ✏️
        </button>
        <button
          onClick={() => onDelete(book)}
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: '6px',
            border: '1px solid #fecaca',
            backgroundColor: '#fff',
            cursor: 'pointer',
            fontSize: '0.8rem',
            color: '#ef4444',
          }}
          title="Delete book"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}
