import React, { useState, useEffect, useCallback } from 'react'
import { BooksService } from '../services/books.service.js'
import BookCard from '../components/BookCard.jsx'
import BookListItem from '../components/BookListItem.jsx'
import BookUploadModal from '../components/BookUploadModal.jsx'
import BookDetailsModal from '../components/BookDetailsModal.jsx'
import BookEditModal from '../components/BookEditModal.jsx'
import BookDeleteModal from '../components/BookDeleteModal.jsx'

export default function LibraryView() {
  const [books, setBooks] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [notification, setNotification] = useState('')

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadQueue, setUploadQueue] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [editingBook, setEditingBook] = useState(null)
  const [deletingBook, setDeletingBook] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPagination((prev) => ({ ...prev, page: 1 }))
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchBooks = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const data = await BooksService.listBooks({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch || undefined,
        sort,
      })

      setBooks(data.books || [])
      setPagination(data.pagination)
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to load library.'
      setErrorMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.limit, debouncedSearch, sort])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  const showNotification = (msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(''), 4000)
  }

  const handleDownload = async (book) => {
    try {
      showNotification(`Preparing download for "${book.title}"…`)
      const { downloadUrl } = await BooksService.getDownloadUrl(book.id)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = book.originalFileName || `${book.title}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to generate download link.'
      setErrorMessage(msg)
    }
  }

  const handleUploadSuccess = (newBook) => {
    showNotification(`"${newBook.title}" uploaded successfully!`)
    fetchBooks()
  }

  const handleBookUpdated = (updatedBook) => {
    setBooks((prev) => prev.map((b) => (b.id === updatedBook.id ? updatedBook : b)))
    showNotification(`"${updatedBook.title}" updated.`)
  }

  const handleBookDeleted = () => {
    showNotification('Book deleted successfully.')
    fetchBooks()
  }

  const activeUploadsCount = uploadQueue.filter((i) =>
    ['uploading', 'processing'].includes(i.status)
  ).length

  return (
    <div>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
            right: '1.25rem',
            backgroundColor: '#0f172a',
            color: '#fff',
            padding: '0.75rem 1.15rem',
            borderRadius: '10px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
            zIndex: 9999,
            fontSize: '0.875rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            maxWidth: 'calc(100vw - 2.5rem)',
          }}
        >
          <span>✨</span>
          <span>{notification}</span>
        </div>
      )}

      {/* Floating Minimized Upload Pill (non-blocking library) */}
      {!isUploadOpen && activeUploadsCount > 0 && (
        <button
          type="button"
          className="rf-upload-pill"
          onClick={() => setIsUploadOpen(true)}
        >
          <span>⏳</span>
          <span>Uploading {activeUploadsCount} PDF{activeUploadsCount > 1 ? 's' : ''}…</span>
        </button>
      )}

      {/* Action Toolbar */}
      <div className="rf-toolbar">
        <div className="rf-toolbar-left">
          <div className="rf-search-wrap">
            <input
              type="text"
              className="rf-search-input"
              placeholder="Search by title, author, or file…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search books"
            />
            <span className="rf-search-icon">🔍</span>
          </div>

          <select
            className="rf-sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort books"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="updated">Recently Updated</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>

        <div className="rf-toolbar-right">
          <div className="rf-view-toggle">
            <button
              type="button"
              className={`rf-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
              aria-label="Grid View"
            >
              ⊞
            </button>
            <button
              type="button"
              className={`rf-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
              aria-label="List View"
            >
              ☰
            </button>
          </div>

          <button
            type="button"
            className="rf-btn-primary"
            onClick={() => setIsUploadOpen(true)}
          >
            <span>+</span>
            <span>Upload PDF</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {errorMessage && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            color: '#b91c1c',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={fetchBooks}
            style={{
              padding: '0.4rem 0.85rem',
              backgroundColor: '#b91c1c',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="rf-book-grid" aria-busy="true" aria-label="Loading library">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="rf-skeleton-card">
              <div>
                <div className="rf-skeleton-line" style={{ width: '40px', height: '40px', marginBottom: '0.85rem' }} />
                <div className="rf-skeleton-line" style={{ width: '85%', height: '18px', marginBottom: '0.5rem' }} />
                <div className="rf-skeleton-line" style={{ width: '55%', height: '14px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="rf-skeleton-line" style={{ width: '50px', height: '12px' }} />
                <div className="rf-skeleton-line" style={{ width: '70px', height: '12px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3.5rem 1.25rem',
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '2px dashed #cbd5e1',
          }}
        >
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem' }}>📚</span>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            {debouncedSearch ? 'No books match your search' : 'Your personal library is empty'}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 auto 1.25rem', maxWidth: '400px' }}>
            {debouncedSearch
              ? 'Try searching with another keyword or clear the search filter.'
              : 'Import your favorite English PDF books to convert them into clean, responsive HTML for reading.'}
          </p>
          {!debouncedSearch && (
            <button
              type="button"
              className="rf-btn-primary"
              onClick={() => setIsUploadOpen(true)}
            >
              Upload Your First Book
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="rf-book-grid">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onSelect={(b) => setSelectedBook(b)}
              onDownload={handleDownload}
              onEdit={(b) => setEditingBook(b)}
              onDelete={(b) => setDeletingBook(b)}
            />
          ))}
        </div>
      ) : (
        <div>
          {books.map((book) => (
            <BookListItem
              key={book.id}
              book={book}
              onSelect={(b) => setSelectedBook(b)}
              onDownload={handleDownload}
              onEdit={(b) => setEditingBook(b)}
              onDelete={(b) => setDeletingBook(b)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && pagination.totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
            marginTop: '2rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            style={{
              minHeight: '40px',
              padding: '0.45rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: pagination.page <= 1 ? '#f1f5f9' : '#fff',
              color: pagination.page <= 1 ? '#94a3b8' : '#334155',
              cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: '0.85rem', color: '#475569' }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            style={{
              minHeight: '40px',
              padding: '0.45rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: pagination.page >= pagination.totalPages ? '#f1f5f9' : '#fff',
              color: pagination.page >= pagination.totalPages ? '#94a3b8' : '#334155',
              cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Modals */}
      <BookUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onMinimize={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        onQueueChange={setUploadQueue}
      />

      <BookDetailsModal
        book={selectedBook}
        isOpen={Boolean(selectedBook)}
        onClose={() => setSelectedBook(null)}
        onDownload={handleDownload}
        onEdit={(b) => setEditingBook(b)}
        onDelete={(b) => setDeletingBook(b)}
      />

      <BookEditModal
        book={editingBook}
        isOpen={Boolean(editingBook)}
        onClose={() => setEditingBook(null)}
        onUpdated={handleBookUpdated}
      />

      <BookDeleteModal
        book={deletingBook}
        isOpen={Boolean(deletingBook)}
        onClose={() => setDeletingBook(null)}
        onDeleted={handleBookDeleted}
      />
    </div>
  )
}
