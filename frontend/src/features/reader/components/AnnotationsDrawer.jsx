import React, { useState, useEffect } from 'react'

export default function AnnotationsDrawer({
  isOpen,
  activeTab, // 'bookmarks' | 'highlights' | 'notes'
  onTabChange,
  onClose,
  bookmarks = [],
  highlights = [],
  notes = [],
  currentChapterTitle,
  currentLocation, // { contentSequence, currentBlockId }
  noteDraft, // optional prefilled draft from selection/lookup
  onClearNoteDraft,
  onNavigateToAnchor,
  onCreateBookmark,
  onUpdateBookmark,
  onDeleteBookmark,
  onChangeHighlightColor,
  onDeleteHighlight,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}) {
  const [bookmarkSort, setBookmarkSort] = useState('date') // 'date' | 'chapter'
  const [noteSearch, setNoteSearch] = useState('')
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editingBookmarkId, setEditingBookmarkId] = useState(null)
  const [bookmarkTitleInput, setBookmarkTitleInput] = useState('')
  const [bookmarkDescInput, setBookmarkDescInput] = useState('')

  useEffect(() => {
    if (noteDraft) {
      setNoteTitle(noteDraft.title || '')
      setNoteContent(noteDraft.content || '')
      setEditingNoteId(null)
    }
  }, [noteDraft])

  if (!isOpen) return null

  const sortedBookmarks = [...bookmarks].sort((a, b) => {
    if (bookmarkSort === 'chapter') {
      return (a.chapterTitle || '').localeCompare(b.chapterTitle || '')
    }
    return new Date(b.createdAt) - new Date(a.createdAt)
  })

  const filteredNotes = notes.filter((n) => {
    if (!noteSearch.trim()) return true
    const q = noteSearch.toLowerCase()
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      (n.selectedText || '').toLowerCase().includes(q)
    )
  })

  const handleSaveNoteSubmit = async (e) => {
    e.preventDefault()
    if (!noteTitle.trim() || !noteContent.trim()) return
    if (editingNoteId) {
      await onUpdateNote(editingNoteId, { title: noteTitle.trim(), content: noteContent.trim() })
      setEditingNoteId(null)
    } else {
      await onCreateNote({
        title: noteTitle.trim(),
        content: noteContent.trim(),
        chapterTitle: noteDraft?.chapterTitle || currentChapterTitle || null,
        selectedText: noteDraft?.selectedText || null,
        anchorData: noteDraft?.anchorData || {
          contentSequence: currentLocation?.currentSequence || 1,
          startBlockId: currentLocation?.currentBlockId || 'block-s1-0',
          startOffset: 0,
          endOffset: 0,
        },
      })
    }
    setNoteTitle('')
    setNoteContent('')
    if (onClearNoteDraft) onClearNoteDraft()
  }

  return (
    <>
      <div className="rf-toc-backdrop" onClick={onClose} />
      <aside className="rf-annotations-drawer" aria-label="Reading Tools">
        <div style={{ padding: '0.75rem 0.9rem', borderBottom: '1px solid var(--r-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: '0.95rem' }}>Reading Tools</strong>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Reading Tools"
            style={{ background: 'none', border: 'none', fontSize: '1.35rem', cursor: 'pointer', color: 'var(--r-muted)' }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--r-border)' }}>
          {[
            { id: 'bookmarks', label: `Bookmarks (${bookmarks.length})` },
            { id: 'highlights', label: `Highlights (${highlights.length})` },
            { id: 'notes', label: `Notes (${notes.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              style={{
                padding: '0.6rem 0.25rem',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === t.id ? '2px solid var(--r-accent)' : '2px solid transparent',
                color: activeTab === t.id ? 'var(--r-accent)' : 'var(--r-muted)',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
          {/* BOOKMARKS TAB */}
          {activeTab === 'bookmarks' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="rf-reader-btn active"
                  onClick={() =>
                    onCreateBookmark({
                      title: currentChapterTitle ? `${currentChapterTitle}` : `Position (Section ${currentLocation?.currentSequence || 1})`,
                      chapterTitle: currentChapterTitle || null,
                      anchorData: {
                        contentSequence: currentLocation?.currentSequence || 1,
                        startBlockId: currentLocation?.currentBlockId || 'block-s1-0',
                        startOffset: 0,
                        endOffset: 0,
                      },
                    })
                  }
                >
                  + Bookmark Here
                </button>

                <select
                  value={bookmarkSort}
                  onChange={(e) => setBookmarkSort(e.target.value)}
                  style={{
                    padding: '0.3rem 0.45rem',
                    borderRadius: '6px',
                    border: '1px solid var(--r-border)',
                    backgroundColor: 'var(--r-bg)',
                    color: 'var(--r-text)',
                    fontSize: '0.76rem',
                  }}
                >
                  <option value="date">Newest</option>
                  <option value="chapter">By Chapter</option>
                </select>
              </div>

              {sortedBookmarks.length === 0 ? (
                <p style={{ fontSize: '0.84rem', color: 'var(--r-muted)', textAlign: 'center', marginTop: '2rem' }}>
                  No bookmarks yet. Save your current reading position above.
                </p>
              ) : (
                sortedBookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    style={{
                      padding: '0.7rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--r-bg)',
                      border: '1px solid var(--r-border)',
                      marginBottom: '0.6rem',
                    }}
                  >
                    {editingBookmarkId === bm.id ? (
                      <div>
                        <input
                          type="text"
                          value={bookmarkTitleInput}
                          onChange={(e) => setBookmarkTitleInput(e.target.value)}
                          style={{ width: '100%', padding: '0.35rem', marginBottom: '0.35rem', boxSizing: 'border-box' }}
                        />
                        <input
                          type="text"
                          value={bookmarkDescInput}
                          onChange={(e) => setBookmarkDescInput(e.target.value)}
                          placeholder="Optional description"
                          style={{ width: '100%', padding: '0.35rem', marginBottom: '0.45rem', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <button type="button" className="rf-reader-btn" onClick={() => setEditingBookmarkId(null)}>Cancel</button>
                          <button
                            type="button"
                            className="rf-reader-btn active"
                            onClick={async () => {
                              await onUpdateBookmark(bm.id, { title: bookmarkTitleInput, description: bookmarkDescInput })
                              setEditingBookmarkId(null)
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          onClick={() => onNavigateToAnchor(bm.anchorData)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>{bm.title}</div>
                          {bm.chapterTitle && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--r-accent)', marginTop: '0.15rem' }}>{bm.chapterTitle}</div>
                          )}
                          {bm.selectedText && (
                            <div style={{ fontSize: '0.76rem', color: 'var(--r-muted)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                              “{bm.selectedText.slice(0, 90)}”
                            </div>
                          )}
                          {bm.description && (
                            <div style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>{bm.description}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.45rem' }}>
                          <button
                            type="button"
                            className="rf-reader-btn"
                            style={{ minHeight: '28px', fontSize: '0.72rem' }}
                            onClick={() => {
                              setEditingBookmarkId(bm.id)
                              setBookmarkTitleInput(bm.title)
                              setBookmarkDescInput(bm.description || '')
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rf-reader-btn"
                            style={{ minHeight: '28px', fontSize: '0.72rem', color: '#ef4444' }}
                            onClick={() => onDeleteBookmark(bm.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* HIGHLIGHTS TAB */}
          {activeTab === 'highlights' && (
            <div>
              {highlights.length === 0 ? (
                <p style={{ fontSize: '0.84rem', color: 'var(--r-muted)', textAlign: 'center', marginTop: '2rem' }}>
                  No highlights yet. Select any text in the book to highlight it.
                </p>
              ) : (
                highlights.map((hl) => (
                  <div
                    key={hl.id}
                    style={{
                      padding: '0.7rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--r-bg)',
                      border: '1px solid var(--r-border)',
                      marginBottom: '0.6rem',
                    }}
                  >
                    <div
                      onClick={() => onNavigateToAnchor(hl.anchorData)}
                      style={{ cursor: 'pointer', fontSize: '0.84rem', lineHeight: 1.45 }}
                    >
                      <span className={`rf-highlight rf-hl-${hl.color}`}>“{hl.selectedText}”</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {['yellow', 'green', 'blue', 'pink', 'purple'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => onChangeHighlightColor(hl.id, c)}
                            className={`rf-hl-dot rf-hl-${c}`}
                            style={{
                              width: '16px',
                              height: '16px',
                              border: hl.color === c ? '2px solid var(--r-text)' : '1px solid var(--r-border)',
                            }}
                            title={`Switch to ${c}`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        className="rf-reader-btn"
                        style={{ minHeight: '26px', fontSize: '0.72rem', color: '#ef4444' }}
                        onClick={() => onDeleteHighlight(hl.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <div>
              <form
                onSubmit={handleSaveNoteSubmit}
                style={{
                  padding: '0.7rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--r-bg)',
                  border: '1px solid var(--r-border)',
                  marginBottom: '0.85rem',
                }}
              >
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--r-accent)', marginBottom: '0.4rem' }}>
                  {editingNoteId ? 'Edit Note' : 'New Reading Note'}
                </div>
                {noteDraft?.selectedText && !editingNoteId && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--r-muted)', fontStyle: 'italic', marginBottom: '0.4rem' }}>
                    “{noteDraft.selectedText.slice(0, 80)}”
                  </div>
                )}
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note title *"
                  required
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid var(--r-border)',
                    backgroundColor: 'var(--r-surface)',
                    color: 'var(--r-text)',
                    fontSize: '0.82rem',
                    marginBottom: '0.4rem',
                    boxSizing: 'border-box',
                  }}
                />
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write your thoughts…"
                  rows={3}
                  required
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid var(--r-border)',
                    backgroundColor: 'var(--r-surface)',
                    color: 'var(--r-text)',
                    fontSize: '0.82rem',
                    marginBottom: '0.45rem',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                  {(editingNoteId || noteDraft) && (
                    <button
                      type="button"
                      className="rf-reader-btn"
                      onClick={() => {
                        setEditingNoteId(null)
                        setNoteTitle('')
                        setNoteContent('')
                        if (onClearNoteDraft) onClearNoteDraft()
                      }}
                    >
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="rf-reader-btn active">
                    {editingNoteId ? 'Update Note' : 'Save Note'}
                  </button>
                </div>
              </form>

              <input
                type="text"
                value={noteSearch}
                onChange={(e) => setNoteSearch(e.target.value)}
                placeholder="Search notes…"
                style={{
                  width: '100%',
                  padding: '0.45rem 0.6rem',
                  borderRadius: '8px',
                  border: '1px solid var(--r-border)',
                  backgroundColor: 'var(--r-bg)',
                  color: 'var(--r-text)',
                  fontSize: '0.82rem',
                  marginBottom: '0.75rem',
                  boxSizing: 'border-box',
                }}
              />

              {filteredNotes.length === 0 ? (
                <p style={{ fontSize: '0.84rem', color: 'var(--r-muted)', textAlign: 'center', marginTop: '1.5rem' }}>
                  No notes found.
                </p>
              ) : (
                filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      padding: '0.7rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--r-bg)',
                      border: '1px solid var(--r-border)',
                      marginBottom: '0.6rem',
                    }}
                  >
                    <div
                      onClick={() => note.anchorData && onNavigateToAnchor(note.anchorData)}
                      style={{ cursor: note.anchorData ? 'pointer' : 'default' }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>{note.title}</div>
                      {note.chapterTitle && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--r-accent)', marginTop: '0.15rem' }}>{note.chapterTitle}</div>
                      )}
                      <p style={{ fontSize: '0.8rem', margin: '0.35rem 0 0 0', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                        {note.content}
                      </p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.45rem' }}>
                      <button
                        type="button"
                        className="rf-reader-btn"
                        style={{ minHeight: '28px', fontSize: '0.72rem' }}
                        onClick={() => {
                          setEditingNoteId(note.id)
                          setNoteTitle(note.title)
                          setNoteContent(note.content)
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rf-reader-btn"
                        style={{ minHeight: '28px', fontSize: '0.72rem', color: '#ef4444' }}
                        onClick={() => onDeleteNote(note.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
