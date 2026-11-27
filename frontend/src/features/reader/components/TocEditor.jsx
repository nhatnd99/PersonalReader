import React, { useState, useEffect } from 'react'

export default function TocEditor({
  mode, // 'create' | 'edit' | null
  initialData,
  maxSequence = 1,
  isSaving,
  onSave,
  onCancel,
}) {
  const [title, setTitle] = useState('')
  const [contentSequence, setContentSequence] = useState(1)

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '')
      setContentSequence(initialData.contentSequence || 1)
    }
  }, [initialData])

  if (!mode) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      contentSequence: Math.min(maxSequence, Math.max(1, parseInt(contentSequence, 10) || 1)),
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: '0.65rem',
        margin: '0.5rem',
        borderRadius: '8px',
        backgroundColor: 'var(--r-bg)',
        border: '1px solid var(--r-border)',
      }}
    >
      <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.45rem', color: 'var(--r-accent)' }}>
        {mode === 'edit' ? 'Edit TOC Entry' : initialData?.parentId ? 'Add Subsection' : 'Add Chapter'}
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Chapter or section title"
        required
        style={{
          width: '100%',
          padding: '0.4rem 0.55rem',
          borderRadius: '6px',
          border: '1px solid var(--r-border)',
          backgroundColor: 'var(--r-surface)',
          color: 'var(--r-text)',
          fontSize: '0.82rem',
          marginBottom: '0.45rem',
          boxSizing: 'border-box',
        }}
      />

      {mode === 'create' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.76rem' }}>
          <label style={{ color: 'var(--r-muted)' }}>Target Section (1–{maxSequence}):</label>
          <input
            type="number"
            min={1}
            max={maxSequence}
            value={contentSequence}
            onChange={(e) => setContentSequence(e.target.value)}
            style={{
              width: '64px',
              padding: '0.25rem 0.4rem',
              borderRadius: '6px',
              border: '1px solid var(--r-border)',
              backgroundColor: 'var(--r-surface)',
              color: 'var(--r-text)',
              fontSize: '0.8rem',
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
        <button type="button" className="rf-reader-btn" onClick={onCancel} disabled={isSaving} style={{ minHeight: '30px', fontSize: '0.75rem' }}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          style={{
            minHeight: '30px',
            padding: '0.25rem 0.65rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'var(--r-accent)',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
