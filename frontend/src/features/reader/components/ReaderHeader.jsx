import React from 'react'
import { Link } from 'react-router-dom'
import SyncStatus from './SyncStatus.jsx'

export default function ReaderHeader({
  bookTitle,
  readingPercentage,
  tocOpen,
  onToggleToc,
  settingsOpen,
  onToggleSettings,
  syncStatus,
  syncProvider,
  onSyncRetry,
}) {
  return (
    <header className="rf-reader-header">
      <div className="rf-reader-header-left">
        <Link to="/" className="rf-reader-btn" style={{ textDecoration: 'none' }} title="Back to Library">
          <span>←</span>
          <span>Library</span>
        </Link>

        <h1 className="rf-reader-book-title" title={bookTitle}>
          {bookTitle}
        </h1>
      </div>

      <div className="rf-reader-header-right">
        <span className="rf-progress-pill" title="Reading progress">
          {Math.round(readingPercentage || 0)}%
        </span>

        <button
          type="button"
          className={`rf-reader-btn ${tocOpen ? 'active' : ''}`}
          onClick={onToggleToc}
          aria-expanded={tocOpen}
          title="Table of Contents"
        >
          <span>📑</span>
          <span>TOC</span>
        </button>

        <button
          type="button"
          className={`rf-reader-btn ${settingsOpen ? 'active' : ''}`}
          onClick={onToggleSettings}
          aria-expanded={settingsOpen}
          title="Reading Settings"
        >
          <span>Aa</span>
        </button>

        <SyncStatus status={syncStatus} provider={syncProvider} onRetry={onSyncRetry} />
      </div>
    </header>
  )
}
