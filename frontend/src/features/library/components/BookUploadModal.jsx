import React, { useState, useRef } from 'react'
import { UploadService } from '../services/upload.service.js'
import { formatBytes, cleanFileNameToTitle } from '../utils/formatters.js'

const MAX_FILE_SIZE_BYTES = 52428800 // 50MB

export default function BookUploadModal({ isOpen, onClose, onMinimize, onUploadSuccess, onQueueChange }) {
  const [queue, setQueue] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState('')
  const abortControllersRef = useRef({})
  const fileInputRef = useRef(null)

  const updateQueue = (updater) => {
    setQueue((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (onQueueChange) onQueueChange(next)
      return next
    })
  }

  const updateItem = (itemId, patch) => {
    updateQueue((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...patch } : item)))
  }

  const handleFilesSelected = (fileList) => {
    if (!fileList || fileList.length === 0) return
    setValidationError('')
    const newItems = []
    const rejected = []

    Array.from(fileList).forEach((file) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        rejected.push(`${file.name}: Only .pdf files are supported`)
        return
      }
      if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
        rejected.push(`${file.name}: Size (${formatBytes(file.size)}) must be between 1 B and 50 MB`)
        return
      }
      newItems.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file,
        title: cleanFileNameToTitle(file.name),
        author: '',
        status: 'queued', // queued | initiating | uploading | verifying | success | error | cancelled
        progress: 0,
        error: '',
        uploadId: null,
      })
    })

    if (rejected.length > 0) {
      setValidationError(rejected.join(' • '))
    }

    if (newItems.length > 0) {
      updateQueue((prev) => [...prev, ...newItems])
    }
  }

  const uploadSingleItem = async (item) => {
    if (!item.title.trim()) {
      updateItem(item.id, { status: 'error', error: 'Title cannot be empty.' })
      return
    }

    const controller = new AbortController()
    abortControllersRef.current[item.id] = controller

    updateItem(item.id, { status: 'initiating', progress: 5, error: '' })

    try {
      const sessionData = await UploadService.initiate({
        fileName: item.file.name,
        fileSize: item.file.size,
        mimeType: item.file.type || 'application/pdf',
        title: item.title.trim(),
        author: item.author.trim() || undefined,
      })

      updateItem(item.id, { uploadId: sessionData.uploadId, status: 'uploading', progress: 10 })

      await UploadService.uploadToR2(
        sessionData.uploadUrl,
        item.file,
        (percent) => {
          updateItem(item.id, { progress: Math.min(90, Math.max(10, percent)) })
        },
        controller.signal
      )

      updateItem(item.id, { status: 'verifying', progress: 95 })
      const completeResult = await UploadService.complete(sessionData.uploadId)

      updateItem(item.id, { status: 'success', progress: 100 })
      if (onUploadSuccess) onUploadSuccess(completeResult.book)
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        updateItem(item.id, { status: 'cancelled', progress: 0 })
        return
      }
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Upload failed. Check your connection and retry.'
      updateItem(item.id, { status: 'error', error: msg })
    } finally {
      delete abortControllersRef.current[item.id]
    }
  }

  const handleStartAll = async (e) => {
    e.preventDefault()
    const pendingItems = queue.filter((i) => i.status === 'queued')
    if (pendingItems.length === 0) return

    // Upload concurrently (max 2-3 files smoothly)
    await Promise.all(pendingItems.map((item) => uploadSingleItem(item)))
  }

  const handleCancelItem = async (item) => {
    if (abortControllersRef.current[item.id]) {
      abortControllersRef.current[item.id].abort()
    }
    if (item.uploadId) {
      await UploadService.cancel(item.uploadId)
    }
    updateItem(item.id, { status: 'cancelled', progress: 0 })
  }

  const handleRemoveItem = (itemId) => {
    updateQueue((prev) => prev.filter((i) => i.id !== itemId))
  }

  const handleClearCompleted = () => {
    updateQueue((prev) => prev.filter((i) => i.status !== 'success' && i.status !== 'cancelled'))
  }

  if (!isOpen) return null

  const activeCount = queue.filter((i) => ['initiating', 'uploading', 'verifying'].includes(i.status)).length
  const queuedCount = queue.filter((i) => i.status === 'queued').length

  return (
    <div
      className="rf-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (activeCount > 0 && onMinimize) onMinimize()
          else onClose()
        }
      }}
    >
      <div className="rf-modal-card" role="dialog" aria-modal="true" aria-labelledby="upload-modal-title">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 id="upload-modal-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Upload PDF Books
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {activeCount > 0 && onMinimize && (
              <button
                type="button"
                onClick={onMinimize}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                Minimize
              </button>
            )}
            <button
              type="button"
              onClick={activeCount > 0 && onMinimize ? onMinimize : onClose}
              aria-label="Close upload dialog"
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#64748b',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {validationError && (
          <div
            style={{
              padding: '0.65rem 0.9rem',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              fontSize: '0.84rem',
              marginBottom: '1rem',
            }}
          >
            {validationError}
          </div>
        )}

        {/* Drag & Drop / File Picker Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            handleFilesSelected(e.dataTransfer.files)
          }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? '#2563eb' : '#cbd5e1'}`,
            borderRadius: '10px',
            backgroundColor: isDragging ? '#eff6ff' : '#f8fafc',
            padding: queue.length > 0 ? '1.1rem 1rem' : '2.25rem 1.25rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease, background-color 0.15s ease',
            marginBottom: '1rem',
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,application/pdf"
            multiple
            onChange={(e) => {
              handleFilesSelected(e.target.files)
              e.target.value = ''
            }}
            style={{ display: 'none' }}
          />
          <span style={{ fontSize: queue.length > 0 ? '1.5rem' : '2.25rem', display: 'block', marginBottom: '0.35rem' }}>
            📄
          </span>
          <p style={{ margin: '0 0 0.2rem 0', fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
            {queue.length > 0 ? 'Add more PDF files' : 'Tap to choose or drag & drop PDFs'}
          </p>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
            Multiple PDFs supported • Max 50 MB per file
          </p>
        </div>

        {/* File Queue List */}
        {queue.length > 0 && (
          <form onSubmit={handleStartAll}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem', maxHeight: '42dvh', overflowY: 'auto' }}>
              {queue.map((item) => {
                const isItemBusy = ['initiating', 'uploading', 'verifying'].includes(item.status)
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.file.name}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          {formatBytes(item.file.size)}
                        </div>
                      </div>

                      {item.status === 'queued' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}
                          title="Remove"
                        >
                          ×
                        </button>
                      )}

                      {isItemBusy && (
                        <button
                          type="button"
                          onClick={() => handleCancelItem(item)}
                          style={{
                            padding: '0.25rem 0.55rem',
                            borderRadius: '6px',
                            border: '1px solid #fecaca',
                            background: '#fff',
                            color: '#dc2626',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      )}

                      {(item.status === 'error' || item.status === 'cancelled') && (
                        <button
                          type="button"
                          onClick={() => uploadSingleItem(item)}
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid #bfdbfe',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Retry
                        </button>
                      )}

                      {item.status === 'success' && (
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#16a34a' }}>
                          ✓ Uploaded
                        </span>
                      )}
                    </div>

                    {item.status === 'queued' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem' }}>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateItem(item.id, { title: e.target.value })}
                          placeholder="Book title *"
                          required
                          style={{
                            padding: '0.45rem 0.6rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.84rem',
                          }}
                        />
                        <input
                          type="text"
                          value={item.author}
                          onChange={(e) => updateItem(item.id, { author: e.target.value })}
                          placeholder="Author (optional)"
                          style={{
                            padding: '0.45rem 0.6rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.84rem',
                          }}
                        />
                      </div>
                    )}

                    {isItemBusy && (
                      <div style={{ marginTop: '0.4rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', marginBottom: '0.25rem' }}>
                          <span>
                            {item.status === 'initiating' && 'Creating secure session…'}
                            {item.status === 'uploading' && 'Uploading to Cloudflare R2…'}
                            {item.status === 'verifying' && 'Verifying PDF integrity…'}
                          </span>
                          <span>{item.progress}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${item.progress}%`,
                              backgroundColor: '#2563eb',
                              transition: 'width 0.2s ease',
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {item.status === 'error' && item.error && (
                      <div style={{ marginTop: '0.35rem', fontSize: '0.76rem', color: '#dc2626' }}>
                        {item.error}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleClearCompleted}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Clear finished
              </button>

              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={activeCount > 0 && onMinimize ? onMinimize : onClose}
                  style={{
                    minHeight: '42px',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#fff',
                    color: '#334155',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  {activeCount > 0 ? 'Run in Background' : 'Close'}
                </button>
                <button
                  type="submit"
                  disabled={queuedCount === 0}
                  className="rf-btn-primary"
                >
                  {queuedCount > 1 ? `Upload ${queuedCount} Books` : 'Start Upload'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
