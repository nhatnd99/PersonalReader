import React from 'react'

const STATUS_META = {
  synced: { label: 'Synced', dot: '#22c55e' },
  syncing: { label: 'Syncing…', dot: '#3b82f6' },
  offline: { label: 'Offline', dot: '#f59e0b' },
  error: { label: 'Sync failed', dot: '#ef4444' },
}

export default function SyncStatus({ status = 'synced', provider = 'polling', onRetry }) {
  const meta = STATUS_META[status] || STATUS_META.synced

  return (
    <button
      type="button"
      className="rf-reader-btn"
      onClick={onRetry}
      title={`Sync status: ${meta.label} (${provider === 'ably' ? 'Real-time push' : 'Polling fallback'})`}
      style={{ fontSize: '0.76rem' }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: meta.dot,
          display: 'inline-block',
        }}
      />
      <span className="rf-sync-label">{meta.label}</span>
    </button>
  )
}
