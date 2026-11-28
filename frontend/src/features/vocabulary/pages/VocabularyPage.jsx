import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { VocabularyService } from '../services/vocabularyService.js'
import { BooksService } from '../../library/services/books.service.js'
import { formatDate } from '../../library/utils/formatters.js'

export default function VocabularyPage() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [books, setBooks] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [bookId, setBookId] = useState('')
  const [sort, setSort] = useState('newest')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [editingEntry, setEditingEntry] = useState(null)
  const [editMeaning, setEditMeaning] = useState('')
  const [editNote, setEditNote] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPagination((prev) => ({ ...prev, page: 1 }))
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    BooksService.listBooks({ limit: 100 })
      .then((res) => setBooks(res.books || []))
      .catch(() => {})
  }, [])

  const fetchVocabulary = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const data = await VocabularyService.list({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch || undefined,
        bookId: bookId || undefined,
        sort,
      })
      setEntries(data.entries || [])
      setPagination(data.pagination)
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to load vocabulary collection.')
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.limit, debouncedSearch, bookId, sort])

  useEffect(() => {
    fetchVocabulary()
  }, [fetchVocabulary])

  const handleOpenInBook = (entry) => {
    if (!entry.bookId) return
    const seq = entry.anchorData?.contentSequence || 1
    const block = entry.anchorData?.startBlockId || ''
    navigate(`/reader/${entry.bookId}?seq=${seq}&block=${encodeURIComponent(block)}`)
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingEntry) return
    const updated = await VocabularyService.update(editingEntry.id, {
      meaning: editMeaning.trim(),
      personalNote: editNote.trim() || null,
    })
    setEntries((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    setEditingEntry(null)
  }

  const handleDelete = async (entryId) => {
    if (!window.confirm('Remove this word from your vocabulary collection?')) return
    await VocabularyService.remove(entryId)
    fetchVocabulary()
  }

  return (
    <div>
      <div className="rf-library-header">
        <span className="rf-library-count">
          {isLoading ? 'Loading vocabulary…' : `${pagination?.total || 0} saved entries`}
        </span>
      </div>

      {/* Filters Toolbar */}
      <div className="rf-toolbar">
        <div className="rf-toolbar-left">
          <div className="rf-search-wrap">
            <input
              type="text"
              className="rf-search-input"
              placeholder="Search words or meanings…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="rf-search-icon">🔍</span>
          </div>

          <select
            className="rf-sort-select"
            value={bookId}
            onChange={(e) => {
              setBookId(e.target.value)
              setPagination((prev) => ({ ...prev, page: 1 }))
            }}
          >
            <option value="">All Books</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>

          <select className="rf-sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="word">Word (A–Z)</option>
          </select>
        </div>
      </div>

      {errorMessage && (
        <div style={{ padding: '1rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1rem' }}>
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div style={{ color: '#64748b', padding: '2rem', textAlign: 'center' }}>Loading vocabulary…</div>
      ) : entries.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '14px', border: '2px dashed #cbd5e1', padding: '3rem 1.5rem', textAlign: 'center' }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📝</span>
          <h3 style={{ margin: '0 0 0.4rem 0', color: '#0f172a' }}>No saved vocabulary yet</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Select any English word or phrase while reading a book and click <strong>Look Up</strong> to save it here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '1rem' }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.65rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div>
                    <strong style={{ fontSize: '1.08rem', color: '#0f172a' }}>{entry.word}</strong>
                    {entry.partOfSpeech && (
                      <span style={{ marginLeft: '0.4rem', fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                        ({entry.partOfSpeech})
                      </span>
                    )}
                    {entry.pronunciation && (
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{entry.pronunciation}</div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{formatDate(entry.createdAt)}</span>
                </div>

                <div style={{ marginTop: '0.5rem', fontWeight: 600, color: '#1d4ed8', fontSize: '0.92rem' }}>
                  {entry.meaning}
                </div>

                {entry.contextualMeaning && (
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: '#334155', lineHeight: 1.45 }}>
                    {entry.contextualMeaning}
                  </p>
                )}

                {entry.exampleSentence && (
                  <div style={{ marginTop: '0.5rem', padding: '0.45rem 0.65rem', background: '#f8fafc', borderLeft: '3px solid #93c5fd', fontSize: '0.78rem', fontStyle: 'italic', color: '#475569' }}>
                    “{entry.exampleSentence}”
                  </div>
                )}

                {entry.personalNote && (
                  <div style={{ marginTop: '0.45rem', fontSize: '0.78rem', color: '#0f172a' }}>
                    <strong>Note:</strong> {entry.personalNote}
                  </div>
                )}

                {entry.book && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.74rem', color: '#64748b' }}>
                    📕 {entry.book.title} {entry.chapterTitle ? `• ${entry.chapterTitle}` : ''}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.6rem', borderTop: '1px solid #f1f5f9', gap: '0.4rem' }}>
                {entry.bookId ? (
                  <button type="button" className="rf-icon-btn" onClick={() => handleOpenInBook(entry)} title="Jump to original sentence">
                    📖 Open in Book
                  </button>
                ) : (
                  <span />
                )}

                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    className="rf-icon-btn"
                    onClick={() => {
                      setEditingEntry(entry)
                      setEditMeaning(entry.meaning)
                      setEditNote(entry.personalNote || '')
                    }}
                  >
                    ✏️
                  </button>
                  <button type="button" className="rf-icon-btn danger" onClick={() => handleDelete(entry.id)}>
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Vocabulary Modal */}
      {editingEntry && (
        <div className="rf-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setEditingEntry(null)}>
          <div className="rf-modal-card" style={{ maxWidth: '460px' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Edit “{editingEntry.word}”</h3>
            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Vietnamese Meaning *
                </label>
                <input
                  type="text"
                  value={editMeaning}
                  onChange={(e) => setEditMeaning(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Personal Note
                </label>
                <textarea
                  rows={3}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="rf-icon-btn" onClick={() => setEditingEntry(null)}>
                  Cancel
                </button>
                <button type="submit" className="rf-btn-primary" style={{ minHeight: '38px' }}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
