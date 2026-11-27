import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ReaderService } from '../services/readerService.js'
import { useReaderSettings } from '../hooks/useReaderSettings.js'
import { useTableOfContents } from '../hooks/useTableOfContents.js'
import { useReadingProgress } from '../hooks/useReadingProgress.js'
import { useRealtimeSync } from '../hooks/useRealtimeSync.js'
import { getOrCreateDeviceId } from '../utils/progressCalculator.js'
import ReaderHeader from '../components/ReaderHeader.jsx'
import ReaderContent from '../components/ReaderContent.jsx'
import TableOfContents from '../components/TableOfContents.jsx'
import ReadingSettings from '../components/ReadingSettings.jsx'
import '../styles/reader.css'

export default function ReaderPage() {
  const { bookId } = useParams()
  const scrollContainerRef = useRef(null)
  const deviceId = useMemo(() => getOrCreateDeviceId(), [])

  const [bundle, setBundle] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [tocOpen, setTocOpen] = useState(() => window.innerWidth >= 1024)
  const [settingsOpen, setSettingsOpen] = useState(false)

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

  const handleRemoteProgress = useCallback(
    (remoteProg) => {
      // Update revision metadata without force-scrolling active user
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
    onRemoteProgress: handleRemoteProgress,
    onRemoteTocChange: refreshToc,
  })

  const effectiveSyncStatus = syncStatus === 'offline' ? 'offline' : syncStatusProxy !== 'synced' ? syncStatusProxy : syncStatus

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
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((prev) => !prev)}
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
        />
      </div>

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
