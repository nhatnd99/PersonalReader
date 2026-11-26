import React from 'react'
import { formatBytes, formatDate } from '../utils/formatters.js'

export default function BookListItem({ book, onSelect, onDownload, onEdit, onDelete }) {
  const file = book.files?.[0]

  return (
    <div
      className="rf-book-list-item"
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>📕</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontWeight: 600,
                fontSize: '0.95rem',
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
              title={book.title}
            >
              {book.title}
            </span>
            <span className={`rf-badge ${book.status === 'ready' ? 'rf-badge-ready' : 'rf-badge-pending'}`}>
              {book.status === 'ready' ? 'Unread' : book.status}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
            <span>{book.author || 'Unknown Author'}</span>
            <span>•</span>
            <span>{file ? formatBytes(file.fileSize) : '—'}</span>
            <span>•</span>
            <span>{formatDate(book.createdAt)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="rf-icon-btn"
          onClick={() => onDownload(book)}
          title="Download original PDF"
          aria-label={`Download ${book.title}`}
        >
          ⬇️
        </button>
        <button
          type="button"
          className="rf-icon-btn"
          onClick={() => onEdit(book)}
          title="Edit metadata"
          aria-label={`Edit ${book.title}`}
        >
          ✏️
        </button>
        <button
          type="button"
          className="rf-icon-btn danger"
          onClick={() => onDelete(book)}
          title="Delete book"
          aria-label={`Delete ${book.title}`}
        >
          🗑️
        </button>
      </div>
    </div>
  )
}
