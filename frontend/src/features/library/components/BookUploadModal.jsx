import React, { useState, useRef, useEffect } from 'react'
import { UploadService } from '../services/upload.service.js'
import { formatBytes, cleanFileNameToTitle } from '../utils/formatters.js'

const MAX_FILE_SIZE_BYTES = 52428800 // 50MB

export default function BookUploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('idle') // idle | initiating | uploading | verifying | success | error
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const abortControllerRef = useRef(null)
  const activeUploadIdRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      setFile(null)
      setTitle('')
      setAuthor('')
      setDescription('')
      setStatus('idle')
      setProgress(0)
      setErrorMessage('')
      setIsDragging(false)
      abortControllerRef.current = null
      activeUploadIdRef.current = null
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Only PDF files (.pdf) are supported.')
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(`File is too large (${formatBytes(selectedFile.size)}). Maximum limit is 50MB.`)
      return
    }

    setFile(selectedFile)
    setTitle(cleanFileNameToTitle(selectedFile.name))
    setErrorMessage('')
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleStartUpload = async (e) => {
    e.preventDefault()
    if (!file) {
      setErrorMessage('Please select a PDF file to upload.')
      return
    }

    if (!title.trim()) {
      setErrorMessage('Please enter a book title.')
      return
    }

    setErrorMessage('')
    setStatus('initiating')
    setProgress(5)

    abortControllerRef.current = new AbortController()

    try {
      // Step 1: Initiate session with backend
      const sessionData = await UploadService.initiate({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/pdf',
        title: title.trim(),
        author: author.trim() || undefined,
        description: description.trim() || undefined,
      })

      activeUploadIdRef.current = sessionData.uploadId

      // Step 2: Direct browser upload to Cloudflare R2
      setStatus('uploading')
      await UploadService.uploadToR2(
        sessionData.uploadUrl,
        file,
        (percent) => {
          // Progress scales from 10% to 90%
          setProgress(Math.min(90, Math.max(10, percent)))
        },
        abortControllerRef.current.signal
      )

      // Step 3: Complete & verify object in backend
      setStatus('verifying')
      setProgress(95)
      const completeResult = await UploadService.complete(sessionData.uploadId)

      setProgress(100)
      setStatus('success')

      setTimeout(() => {
        onUploadSuccess(completeResult.book)
        onClose()
      }, 1000)
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        setStatus('idle')
        setProgress(0)
        return
      }

      const msg =
        err.response?.data?.error ||
        err.message ||
        'Failed to upload PDF. Please check your network and try again.'
      setErrorMessage(msg)
      setStatus('error')
    }
  }

  const handleCancelUpload = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (activeUploadIdRef.current) {
      await UploadService.cancel(activeUploadIdRef.current)
    }
    setStatus('idle')
    setProgress(0)
  }

  const isUploading = status === 'initiating' || status === 'uploading' || status === 'verifying'

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
        if (e.target === e.currentTarget && !isUploading) onClose()
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '540px',
          padding: '1.75rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: '#1a1a1a' }}>
            Upload PDF Book
          </h2>
          {!isUploading && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#666',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              fontSize: '0.875rem',
              marginBottom: '1rem',
            }}
          >
            {errorMessage}
          </div>
        )}

        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <span style={{ fontSize: '3rem' }}>🎉</span>
            <h3 style={{ fontSize: '1.2rem', color: '#15803d', marginTop: '0.75rem', marginBottom: '0.5rem' }}>
              Upload Complete!
            </h3>
            <p style={{ color: '#555', fontSize: '0.9rem' }}>
              Your book has been stored securely in Cloudflare R2 and added to your library.
            </p>
          </div>
        ) : (
          <form onSubmit={handleStartUpload}>
            {/* Drag & Drop Zone */}
            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? '#2563eb' : '#d1d5db'}`,
                  borderRadius: '10px',
                  backgroundColor: isDragging ? '#eff6ff' : '#f9fafb',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                  marginBottom: '1.25rem',
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,application/pdf"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  style={{ display: 'none' }}
                />
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📄</span>
                <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, color: '#374151' }}>
                  Click to select or drag and drop your PDF
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                  Supports PDF up to 50 MB
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '8px',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                  <span style={{ fontSize: '1.5rem' }}>📑</span>
                  <div style={{ overflow: 'hidden' }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        color: '#1f2937',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {file.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {formatBytes(file.size)}
                    </div>
                  </div>
                </div>
                {!isUploading && (
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}
                  >
                    Change
                  </button>
                )}
              </div>
            )}

            {/* Book Metadata Fields */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                Book Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isUploading}
                placeholder="e.g. The Great Gatsby"
                required
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                Author (Optional)
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                disabled={isUploading}
                placeholder="e.g. F. Scott Fitzgerald"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Progress Bar & Status */}
            {isUploading && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#4b5563', marginBottom: '0.35rem' }}>
                  <span>
                    {status === 'initiating' && 'Preparing secure upload session…'}
                    {status === 'uploading' && `Uploading directly to Cloudflare R2 (${progress}%)…`}
                    {status === 'verifying' && 'Verifying PDF integrity and saving…'}
                  </span>
                  <span>{progress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${progress}%`,
                      backgroundColor: '#2563eb',
                      transition: 'width 0.2s ease',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              {isUploading ? (
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#fff',
                    color: '#ef4444',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel Upload
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      backgroundColor: '#fff',
                      color: '#4b5563',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!file}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: file ? '#2563eb' : '#93c5fd',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: file ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Start Upload
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
