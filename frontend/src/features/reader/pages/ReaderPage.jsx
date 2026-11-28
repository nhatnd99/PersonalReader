import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { ReaderService } from '../services/readerService.js'
import { VocabularyService } from '../../vocabulary/services/vocabularyService.js'
import { useReaderSettings } from '../hooks/useReaderSettings.js'
import { useTableOfContents } from '../hooks/useTableOfContents.js'
import { useReadingProgress } from '../hooks/useReadingProgress.js'
import { useRealtimeSync } from '../hooks/useRealtimeSync.js'
import { useAnnotations } from '../hooks/useAnnotations.js'
import { getOrCreateDeviceId } from '../utils/progressCalculator.js'
import ReaderHeader from '../components/ReaderHeader.jsx'
import ReaderContent from '../components/ReaderContent.jsx'
import TableOfContents from '../components/TableOfContents.jsx'
import ReadingSettings from '../components/ReadingSettings.jsx'
import SelectionToolbar from '../components/SelectionToolbar.jsx'
import VocabularyLookupPopup from '../components/VocabularyLookupPopup.jsx'
import AnnotationsDrawer from '../components/AnnotationsDrawer.jsx'
import '../styles/reader.css'

export default function ReaderPage() {
  const { bookId } = useParams()
  const [searchParams] = useSearchParams()
  const scrollContainerRef = useRef(null)
  const deviceId = useMemo(() => getOrCreateDeviceId(), [])

  const [bundle, setBundle] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  // Auxiliary panels (keep only one auxiliary drawer/panel open at a time on smaller viewports)
  const [tocOpen, setTocOpen] = useState(() => window.innerWidth >= 1024)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [toolsTab, setToolsTab] = useState('bookmarks')

  // Selection & Highlight popover state
  const [selection, setSelection] = useState(null)
  const [activeHighlight, setActiveHighlight] = useState(null)
  const [noteDraft, setNoteDraft] = useState(null)

  // Contextual Vocabulary Lookup state
  const [lookupOpen, setLookupOpen] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [lookupSelectionMeta, setLookupSelectionMeta] = useState(null)

  const loadReader = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const data = await ReaderService.getReaderBundle(bookId)
      setBundle(data)
    } catch (err) {
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to load book for reading.')
    } finally {
      setIsLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    loadReader()
  }, [loadReader])

  const { preferences, updatePreference } = useReaderSettings(bundle?.preferences)

  const {
    entries: tocEntries,
    tree: tocTree,
    tocVersion,
    activeEntryId,
    setActiveEntryId,
    tocError,
    isMutating: isTocMutating,
    refreshToc,
    createEntry,
    updateEntry,
    deleteEntry,
    moveEntry,
    resetToAuto,
  } = useTableOfContents(bookId, bundle?.toc, bundle?.tocVersion)

  const {
    highlights,
    bookmarks,
    notes,
    annotationsVersion,
    setAnnotationsVersion,
    refreshAnnotations,
    createHighlight,
    updateHighlightColor,
    deleteHighlight,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    createNote,
    updateNote,
    deleteNote,
  } = useAnnotations(bookId)

  useEffect(() => {
    if (bundle?.book?.annotationsVersion) {
      setAnnotationsVersion(bundle.book.annotationsVersion)
    }
  }, [bundle?.book?.annotationsVersion, setAnnotationsVersion])

  const [syncStatusProxy, setSyncStatusProxy] = useState('synced')

  const { progress, setProgress, scrollToLocation } = useReadingProgress({
    bookId,
    contents: bundle?.contents,
    tocEntries,
    initialProgress: bundle?.progress,
    deviceId,
    containerRef: scrollContainerRef,
    onActiveTocChange: setActiveEntryId,
    onSyncStateChange: setSyncStatusProxy,
  })

  // Deep-link jump from Vocabulary Collection (?seq=...&block=...)
  useEffect(() => {
    if (!bundle?.contents || bundle.contents.length === 0) return
    const seqParam = searchParams.get('seq')
    const blockParam = searchParams.get('block')
    if (seqParam || blockParam) {
      const timer = setTimeout(() => {
        scrollToLocation({
          blockId: blockParam || undefined,
          sequence: seqParam ? parseInt(seqParam, 10) : undefined,
        })
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [bundle?.contents, searchParams, scrollToLocation])

  const handleRemoteProgress = useCallback(
    (remoteProg) => {
      setProgress((prev) => ({ ...prev, revision: remoteProg.revision }))
    },
    [setProgress]
  )

  const {
    syncStatus,
    syncProvider,
    remoteUpdate,
    dismissRemoteUpdate,
    syncNow,
  } = useRealtimeSync({
    bookId,
    deviceId,
    localRevision: progress.revision,
    localTocVersion: tocVersion,
    localAnnotationsVersion: annotationsVersion,
    onRemoteProgress: handleRemoteProgress,
    onRemoteTocChange: refreshToc,
    onRemoteAnnotationsChange: refreshAnnotations,
  })

  const currentChapterTitle = useMemo(() => {
    if (!activeEntryId || !tocEntries) return null
    return tocEntries.find((t) => t.id === activeEntryId)?.title || null
  }, [activeEntryId, tocEntries])

  const clearSelectionUI = () => {
    setSelection(null)
    setActiveHighlight(null)
    if (window.getSelection) {
      window.getSelection().removeAllRanges()
    }
  }

  const handleCreateHighlight = async (color) => {
    if (!selection) return
    try {
      await createHighlight({
        tocEntryId: activeEntryId || null,
        selectedText: selection.selectedText,
        anchorData: selection.anchorData,
        color,
      })
    } finally {
      clearSelectionUI()
    }
  }

  const handleLookUp = async () => {
    if (!selection) return
    const meta = selection
    setLookupSelectionMeta(meta)
    setLookupOpen(true)
    setLookupLoading(true)
    setLookupError('')
    setLookupResult(null)
    clearSelectionUI()

    try {
      const res = await VocabularyService.lookup({
        word: meta.selectedText,
        sentence: meta.context?.sentence || meta.selectedText,
        previousSentence: meta.context?.previousSentence || null,
        nextSentence: meta.context?.nextSentence || null,
        chapterTitle: currentChapterTitle || null,
        surroundingParagraph: meta.context?.surroundingParagraph || null,
        bookId,
      })
      setLookupResult(res)
    } catch (err) {
      setLookupError(err.response?.data?.error || err.message || 'Vocabulary lookup failed.')
    } finally {
      setLookupLoading(false)
    }
  }

  const handleSaveToVocabulary = async (lookup) => {
    await VocabularyService.create({
      bookId,
      tocEntryId: activeEntryId || null,
      chapterTitle: currentChapterTitle || null,
      word: lookup.word,
      partOfSpeech: lookup.partOfSpeech || null,
      meaning: lookup.vietnameseMeaning || lookup.generalMeaning || '',
      contextualMeaning: lookup.contextualMeaning || null,
      exampleSentence: lookup.exampleSentence || lookupSelectionMeta?.context?.sentence || null,
      anchorData: lookupSelectionMeta?.anchorData || null,
      pronunciation: lookup.pronunciation || null,
    })
  }

  const handleOpenNoteFromSelection = (source) => {
    setNoteDraft({
      title: source.selectedText ? source.selectedText.slice(0, 60) : '',
      content: '',
      selectedText: source.selectedText || '',
      anchorData: source.anchorData || null,
      chapterTitle: currentChapterTitle || null,
    })
    setToolsTab('notes')
    setToolsOpen(true)
    setSettingsOpen(false)
    clearSelectionUI()
  }

  const handleBookmarkFromSelection = async () => {
    if (!selection) return
    await createBookmark({
      tocEntryId: activeEntryId || null,
      chapterTitle: currentChapterTitle || null,
      anchorData: selection.anchorData,
      selectedText: selection.selectedText,
      title: selection.selectedText.slice(0, 80),
    })
    setToolsTab('bookmarks')
    setToolsOpen(true)
    setSettingsOpen(false)
    clearSelectionUI()
  }

  const effectiveSyncStatus =
    syncStatus === 'offline' ? 'offline' : syncStatusProxy !== 'synced' ? syncStatusProxy : syncStatus

  if (isLoading) {
    return (
      <div className={`rf-reader-shell theme-${preferences.theme || 'light'}`} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--r-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📖</div>
          <p>Loading book content…</p>
        </div>
      </div>
    )
  }

  if (errorMessage || !bundle) {
    return (
      <div className="rf-reader-shell theme-light" style={{ alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ maxWidth: '420px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Unable to Open Book</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>{errorMessage}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            <Link to="/" className="rf-reader-btn" style={{ textDecoration: 'none' }}>
              ← Back to Library
            </Link>
            <button type="button" className="rf-reader-btn active" onClick={loadReader}>
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rf-reader-shell theme-${preferences.theme || 'light'}`}>
      <ReaderHeader
        bookTitle={bundle.book.title}
        readingPercentage={progress.readingPercentage}
        tocOpen={tocOpen}
        onToggleToc={() => setTocOpen((prev) => !prev)}
        toolsOpen={toolsOpen}
        onToggleTools={() => {
          setToolsOpen((prev) => !prev)
          setSettingsOpen(false)
        }}
        settingsOpen={settingsOpen}
        onToggleSettings={() => {
          setSettingsOpen((prev) => !prev)
          setToolsOpen(false)
        }}
        syncStatus={effectiveSyncStatus}
        syncProvider={syncProvider}
        onSyncRetry={syncNow}
      />

      <ReadingSettings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        preferences={preferences}
        onChange={updatePreference}
      />

      <AnnotationsDrawer
        isOpen={toolsOpen}
        activeTab={toolsTab}
        onTabChange={setToolsTab}
        onClose={() => setToolsOpen(false)}
        bookmarks={bookmarks}
        highlights={highlights}
        notes={notes}
        currentChapterTitle={currentChapterTitle}
        currentLocation={progress}
        noteDraft={noteDraft}
        onClearNoteDraft={() => setNoteDraft(null)}
        onNavigateToAnchor={(anchor) => {
          scrollToLocation({
            blockId: anchor?.startBlockId,
            sequence: anchor?.contentSequence,
          })
          if (window.innerWidth < 1024) setToolsOpen(false)
        }}
        onCreateBookmark={createBookmark}
        onUpdateBookmark={updateBookmark}
        onDeleteBookmark={deleteBookmark}
        onChangeHighlightColor={updateHighlightColor}
        onDeleteHighlight={deleteHighlight}
        onCreateNote={createNote}
        onUpdateNote={updateNote}
        onDeleteNote={deleteNote}
      />

      <div className="rf-reader-body">
        <TableOfContents
          isOpen={tocOpen}
          onClose={() => setTocOpen(false)}
          tree={tocTree}
          activeEntryId={activeEntryId}
          maxSequence={bundle.contents?.length || 1}
          currentSequence={progress.currentSequence || 1}
          tocError={tocError}
          isMutating={isTocMutating}
          onSelectEntry={(entry) => {
            setActiveEntryId(entry.id)
            scrollToLocation({
              anchorId: entry.anchorId,
              blockId: entry.contentBlockId,
              sequence: entry.contentSequence,
            })
          }}
          onCreateEntry={createEntry}
          onUpdateEntry={updateEntry}
          onDeleteEntry={deleteEntry}
          onMoveEntry={moveEntry}
          onResetToAuto={resetToAuto}
        />

        <ReaderContent
          contents={bundle.contents}
          preferences={preferences}
          containerRef={scrollContainerRef}
          highlights={highlights}
          onSelectionChange={(sel) => {
            setSelection(sel)
            if (sel) setActiveHighlight(null)
          }}
          onClickHighlight={(hl) => {
            setActiveHighlight(hl)
            setSelection(null)
          }}
        />
      </div>

      {/* Floating Text Selection & Highlight Toolbar */}
      <SelectionToolbar
        selection={selection}
        activeHighlight={activeHighlight}
        onHighlight={handleCreateHighlight}
        onChangeHighlightColor={async (id, color) => {
          await updateHighlightColor(id, color)
          setActiveHighlight(null)
        }}
        onDeleteHighlight={async (id) => {
          await deleteHighlight(id)
          setActiveHighlight(null)
        }}
        onLookUp={handleLookUp}
        onAddNote={handleOpenNoteFromSelection}
        onBookmark={handleBookmarkFromSelection}
      />

      {/* Contextual Vocabulary Lookup Popup */}
      <VocabularyLookupPopup
        isOpen={lookupOpen}
        isLoading={lookupLoading}
        errorMessage={lookupError}
        lookupResult={lookupResult}
        onClose={() => setLookupOpen(false)}
        onRetry={() => {
          if (lookupSelectionMeta) {
            setSelection(lookupSelectionMeta)
            handleLookUp()
          }
        }}
        onSaveToVocabulary={handleSaveToVocabulary}
        onAddNote={(lookup) => {
          setLookupOpen(false)
          setNoteDraft({
            title: lookup.word,
            content: `${lookup.vietnameseMeaning}\n\n${lookup.contextualMeaning || ''}`.trim(),
            selectedText: lookup.word,
            anchorData: lookupSelectionMeta?.anchorData || null,
            chapterTitle: currentChapterTitle || null,
          })
          setToolsTab('notes')
          setToolsOpen(true)
        }}
      />

      {/* Non-interrupting Remote Sync Banner */}
      {remoteUpdate && (
        <div className="rf-remote-banner" role="status">
          <span>Synced from another device ({Math.round(remoteUpdate.readingPercentage)}%)</span>
          <button
            type="button"
            onClick={() => {
              scrollToLocation({
                blockId: remoteUpdate.currentBlockId,
                sequence: remoteUpdate.currentSequence,
                scrollPercentage: remoteUpdate.scrollPercentage,
              })
              setProgress((prev) => ({
                ...prev,
                currentBlockId: remoteUpdate.currentBlockId,
                currentSequence: remoteUpdate.currentSequence,
                readingPercentage: remoteUpdate.readingPercentage,
                scrollPercentage: remoteUpdate.scrollPercentage,
                revision: remoteUpdate.revision,
              }))
              dismissRemoteUpdate()
            }}
            style={{
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '9999px',
              padding: '0.25rem 0.65rem',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Jump
          </button>
          <button
            type="button"
            onClick={dismissRemoteUpdate}
            aria-label="Dismiss sync notice"
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
