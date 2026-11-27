import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BooksService } from '../services/books.service.js'
import { formatDate } from '../utils/formatters.js'

export default function BookDetailsModal({ book, isOpen, onClose, onEdit, onDelete }) {
  const navigate = useNavigate()
  const [chapters, setChapters] = useState([])
  const [previewChunk, setPreviewChunk] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    setShowPreview(false)
    setPreviewChunk(null)
    setChapters([])
  }, [book?.id, isOpen])

  if (!isOpen || !book) return null

  const handleTogglePreview = async () => {
    if (showPreview) {
      setShowPreview(false)
      return
    }

    setShowPreview(true)
    if (previewChunk) return

    setLoadingPreview(true)
    try {
      const [chaptersList, contentsData] = await Promise.all([
        BooksService.getBookChapters(book.id),
        BooksService.getBookContents(book.id, { page: 1, limit: 1 }),
      ])
      setChapters(chaptersList || [])
      setPreviewChunk(contentsData.contents?.[0] || null)
    } catch (_) {
      // Ignore preview load errors
    } finally {
      setLoadingPreview(false)
    }
  }

  return (
    <div
      className="rf-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="rf-modal-card" role="dialog" aria-modal="true" aria-labelledby="book-details-title">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0,
              }}
            >
              📕
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 id="book-details-title" style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a', wordBreak: 'break-word' }}>
                {book.title}
              </h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                {book.author || 'Unknown Author'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Metadata Table */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '1rem',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>STATUS</div>
            <div style={{ marginTop: '0.2rem' }}>
              <span className={`rf-badge ${book.status === 'ready' ? 'rf-badge-ready' : 'rf-badge-pending'}`}>
                {book.processingStatus || book.status}
              </span>
            </div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>PAGES</div>
            <div style={{ marginTop: '0.2rem', fontWeight: 600, color: '#0f172a' }}>
              {book.totalPages ?? book.pageCount ?? '—'}
            </div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>WORDS</div>
            <div style={{ marginTop: '0.2rem', fontWeight: 600, color: '#0f172a' }}>
              {book.totalWords ? book.totalWords.toLocaleString() : '—'}
            </div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>LANGUAGE</div>
            <div style={{ marginTop: '0.2rem', fontWeight: 600, color: '#0f172a' }}>
              {book.language || 'English'}
            </div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>ADDED</div>
            <div style={{ marginTop: '0.2rem', fontWeight: 600, color: '#0f172a' }}>
              {formatDate(book.createdAt)}
            </div>
          </div>
        </div>

        {book.description && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>DESCRIPTION</div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>{book.description}</p>
          </div>
        )}

        {/* Structured HTML Preview Section */}
        {showPreview && (
          <div
            style={{
              marginBottom: '1.25rem',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1rem',
              backgroundColor: '#ffffff',
              maxHeight: '240px',
              overflowY: 'auto',
            }}
          >
            {loadingPreview ? (
              <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Loading structured HTML…</div>
            ) : (
              <>
                {chapters.length > 0 && (
                  <div style={{ marginBottom: '0.75rem', fontSize: '0.78rem', color: '#475569' }}>
                    <strong>Detected Chapters ({chapters.length}):</strong>{' '}
                    {chapters.slice(0, 5).map((c) => c.title).join(' • ')}
                    {chapters.length > 5 ? '…' : ''}
                  </div>
                )}
                {previewChunk ? (
                  <div
                    style={{ fontSize: '0.88rem', lineHeight: 1.65, color: '#1e293b' }}
                    dangerouslySetInnerHTML={{ __html: previewChunk.contentHtml }}
                  />
                ) : (
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>No structured HTML chunks available.</div>
                )}
              </>
            )}
          </div>
        )}

        {/* Reflow Reader Launch Bar */}
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: '0.82rem', color: '#1e40af' }}>
            <strong>📖 Reflow Reader:</strong> Read structured HTML with Table of Contents & cross-device sync.
          </div>
          <button
            type="button"
            disabled={book.status !== 'ready'}
            onClick={() => {
              onClose()
              navigate(`/reader/${book.id}`)
            }}
            className="rf-btn-primary"
            style={{ minHeight: '38px', padding: '0.45rem 0.95rem', fontSize: '0.82rem' }}
          >
            Open Book
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => {
              onClose()
              onDelete(book)
            }}
            style={{
              minHeight: '42px',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              backgroundColor: '#ffffff',
              color: '#dc2626',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            🗑️ Delete
          </button>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                onClose()
                onEdit(book)
              }}
              style={{
                minHeight: '42px',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              ✏️ Edit Info
            </button>
            <button
              type="button"
              onClick={handleTogglePreview}
              className="rf-btn-primary"
            >
              {showPreview ? 'Hide HTML Preview' : '👁️ Preview HTML'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
