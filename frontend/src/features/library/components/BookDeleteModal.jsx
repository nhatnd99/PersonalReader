import React, { useState } from 'react'
import { BooksService } from '../services/books.service.js'

export default function BookDeleteModal({ book, isOpen, onClose, onDeleted }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  if (!isOpen || !book) return null

  const handleDelete = async () => {
    setIsDeleting(true)
    setErrorMessage('')

    try {
      await BooksService.deleteBook(book.id)
      onDeleted(book.id)
      onClose()
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to delete book.'
      setErrorMessage(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose()
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '440px',
          padding: '1.75rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.75rem' }}>⚠️</span>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#111827' }}>
            Delete Book
          </h2>
        </div>

        <p style={{ color: '#4b5563', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 1rem 0' }}>
          Are you sure you want to delete <strong>&ldquo;{book.title}&rdquo;</strong>? This action will remove the PDF file from Cloudflare R2 storage and cannot be undone.
        </p>

        {errorMessage && (
          <div
            style={{
              padding: '0.6rem 0.8rem',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              fontSize: '0.85rem',
              marginBottom: '1rem',
            }}
          >
            {errorMessage}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            style={{
              padding: '0.55rem 1.15rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#fff',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              padding: '0.55rem 1.15rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#ef4444',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isDeleting ? 'wait' : 'pointer',
            }}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
