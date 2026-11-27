import React, { useState } from 'react'
import TocItem from './TocItem.jsx'
import TocEditor from './TocEditor.jsx'

export default function TableOfContents({
  isOpen,
  onClose,
  tree = [],
  activeEntryId,
  maxSequence = 1,
  currentSequence = 1,
  tocError,
  isMutating,
  onSelectEntry,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
  onMoveEntry,
  onResetToAuto,
}) {
  const [editMode, setEditMode] = useState(false)
  const [editorState, setEditorState] = useState({ mode: null, data: null })

  const handleSaveEditor = async ({ title, contentSequence }) => {
    if (editorState.mode === 'create') {
      await onCreateEntry({
        title,
        parentId: editorState.data?.parentId || null,
        level: editorState.data?.level || 1,
        contentSequence,
      })
    } else if (editorState.mode === 'edit' && editorState.data?.id) {
      await onUpdateEntry(editorState.data.id, { title })
    }
    setEditorState({ mode: null, data: null })
  }

  return (
    <>
      {isOpen && <div className="rf-toc-backdrop" onClick={onClose} />}
      <aside className={`rf-toc-sidebar ${isOpen ? 'open' : ''}`} aria-label="Table of Contents">
        <div
          style={{
            padding: '0.75rem 0.85rem',
            borderBottom: '1px solid var(--r-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <strong style={{ fontSize: '0.9rem' }}>Table of Contents</strong>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <button
              type="button"
              className={`rf-reader-btn ${editMode ? 'active' : ''}`}
              onClick={() => setEditMode((prev) => !prev)}
              style={{ minHeight: '30px', padding: '0.2rem 0.5rem', fontSize: '0.74rem' }}
            >
              {editMode ? 'Done' : 'Customize'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close TOC"
              style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--r-muted)' }}
            >
              ×
            </button>
          </div>
        </div>

        {editMode && (
          <div
            style={{
              padding: '0.5rem 0.75rem',
              borderBottom: '1px solid var(--r-border)',
              display: 'flex',
              gap: '0.4rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="rf-reader-btn"
              onClick={() =>
                setEditorState({
                  mode: 'create',
                  data: { parentId: null, level: 1, contentSequence: currentSequence },
                })
              }
              style={{ minHeight: '30px', fontSize: '0.74rem' }}
            >
              + Add Chapter
            </button>
            <button
              type="button"
              className="rf-reader-btn"
              disabled={isMutating}
              onClick={() => {
                if (window.confirm('Reset Table of Contents back to auto-generated headings?')) {
                  onResetToAuto()
                }
              }}
              style={{ minHeight: '30px', fontSize: '0.74rem' }}
            >
              ↺ Reset Auto
            </button>
          </div>
        )}

        {tocError && (
          <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.76rem', color: '#ef4444' }}>
            {tocError}
          </div>
        )}

        <TocEditor
          mode={editorState.mode}
          initialData={editorState.data}
          maxSequence={maxSequence}
          isSaving={isMutating}
          onSave={handleSaveEditor}
          onCancel={() => setEditorState({ mode: null, data: null })}
        />

        <div className="rf-toc-list">
          {tree.length === 0 ? (
            <div style={{ padding: '1.5rem 1rem', fontSize: '0.82rem', color: 'var(--r-muted)', textAlign: 'center' }}>
              No chapters detected in this book. You can add manual chapters using Customize.
            </div>
          ) : (
            tree.map((node) => (
              <TocItem
                key={node.id}
                node={node}
                activeEntryId={activeEntryId}
                editMode={editMode}
                onSelect={(entry) => {
                  onSelectEntry(entry)
                  if (window.innerWidth < 1024) onClose()
                }}
                onEdit={(entry) => setEditorState({ mode: 'edit', data: entry })}
                onAddSub={(parent) =>
                  setEditorState({
                    mode: 'create',
                    data: {
                      parentId: parent.id,
                      level: Math.min(4, (parent.level || 1) + 1),
                      contentSequence: parent.contentSequence || currentSequence,
                    },
                  })
                }
                onDelete={onDeleteEntry}
                onMove={onMoveEntry}
              />
            ))
          )}
        </div>
      </aside>
    </>
  )
}
