import React, { useState, useEffect, useCallback } from 'react'
import { BooksService } from '../services/books.service.js'
import BookCard from '../components/BookCard.jsx'
import BookListItem from '../components/BookListItem.jsx'
import BookUploadModal from '../components/BookUploadModal.jsx'
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
  const [editingBook, setEditingBook] = useState(null)
  const [deletingBook, setDeletingBook] = useState(null)

  // Debounce search input
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
      // Trigger download
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = book.originalFileName || `${book.title}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to generate download link.'
      alert(msg)
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

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '1rem 0' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#1f2937',
            color: '#fff',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
            zIndex: 9999,
            fontSize: '0.875rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>✨</span>
          <span>{notification}</span>
        </div>
      )}

      {/* Action Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 280px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
            <input
              type="text"
              placeholder="Search by title, author, or file…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
            <span style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.85rem' }}>
              🔍
            </span>
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              padding: '0.55rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              backgroundColor: '#fff',
              fontSize: '0.875rem',
              color: '#374151',
              cursor: 'pointer',
            }}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.45rem 0.65rem',
                background: viewMode === 'grid' ? '#e5e7eb' : '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
              title="Grid View"
            >
              ⊞
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '0.45rem 0.65rem',
                background: viewMode === 'list' ? '#e5e7eb' : '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
              title="List View"
            >
              ☰
            </button>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <span>+</span>
            <span>Upload PDF</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#b91c1c',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{errorMessage}</span>
          <button
            onClick={fetchBooks}
            style={{
              padding: '0.35rem 0.75rem',
              backgroundColor: '#b91c1c',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#6b7280' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>Loading your library…</p>
        </div>
      ) : books.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 1.5rem',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '2px dashed #e5e7eb',
          }}
        >
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem' }}>📚</span>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#111827', margin: '0 0 0.5rem 0' }}>
            {debouncedSearch ? 'No books match your search' : 'Your personal library is empty'}
          </h3>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0 0 1.25rem 0', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
            {debouncedSearch
              ? 'Try searching with another keyword or clear the search filter.'
              : 'Upload your favorite English PDF books to Cloudflare R2 storage to begin reading and learning.'}
          </p>
          {!debouncedSearch && (
            <button
              onClick={() => setIsUploadOpen(true)}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Upload Your First Book
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
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
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <button
            disabled={pagination.page <= 1}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: pagination.page <= 1 ? '#f3f4f6' : '#fff',
              color: pagination.page <= 1 ? '#9ca3af' : '#374151',
              cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
            }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: '0.85rem', color: '#4b5563' }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: pagination.page >= pagination.totalPages ? '#f3f4f6' : '#fff',
              color: pagination.page >= pagination.totalPages ? '#9ca3af' : '#374151',
              cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
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
        onUploadSuccess={handleUploadSuccess}
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
