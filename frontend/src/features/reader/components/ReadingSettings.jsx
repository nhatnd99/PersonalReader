import React from 'react'

export default function ReadingSettings({ isOpen, onClose, preferences, onChange }) {
  if (!isOpen) return null

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 65 }} onClick={onClose} />
      <div className="rf-settings-panel" role="dialog" aria-label="Reading settings">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <strong style={{ fontSize: '0.95rem' }}>Reading Settings</strong>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--r-muted)' }}
          >
            ×
          </button>
        </div>

        {/* Theme */}
        <div style={{ marginBottom: '0.9rem' }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--r-muted)', marginBottom: '0.4rem' }}>
            THEME
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
            {[
              { id: 'light', label: 'Light', bg: '#ffffff', color: '#1e293b' },
              { id: 'sepia', label: 'Sepia', bg: '#f4ecd8', color: '#3d2e1e' },
              { id: 'dark', label: 'Dark', bg: '#0f172a', color: '#e2e8f0' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange({ theme: t.id })}
                style={{
                  padding: '0.45rem',
                  borderRadius: '8px',
                  backgroundColor: t.bg,
                  color: t.color,
                  border: preferences.theme === t.id ? '2px solid var(--r-accent)' : '1px solid var(--r-border)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Family */}
        <div style={{ marginBottom: '0.9rem' }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--r-muted)', marginBottom: '0.4rem' }}>
            FONT FAMILY
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
            {[
              { id: 'serif', label: 'Serif' },
              { id: 'sans', label: 'Sans' },
              { id: 'mono', label: 'Mono' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onChange({ fontFamily: f.id })}
                className={`rf-reader-btn ${preferences.fontFamily === f.id ? 'active' : ''}`}
                style={{ justifyContent: 'center' }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div style={{ marginBottom: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
            <span style={{ color: 'var(--r-muted)', fontWeight: 600 }}>FONT SIZE</span>
            <span>{preferences.fontSize}px</span>
          </div>
          <input
            type="range"
            min="14"
            max="28"
            step="1"
            value={preferences.fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>

        {/* Line Height */}
        <div style={{ marginBottom: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
            <span style={{ color: 'var(--r-muted)', fontWeight: 600 }}>LINE HEIGHT</span>
            <span>{preferences.lineHeight}</span>
          </div>
          <input
            type="range"
            min="1.3"
            max="2.2"
            step="0.05"
            value={preferences.lineHeight}
            onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>

        {/* Content Width */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
            <span style={{ color: 'var(--r-muted)', fontWeight: 600 }}>READING WIDTH</span>
            <span>{preferences.contentWidth}px</span>
          </div>
          <input
            type="range"
            min="520"
            max="960"
            step="20"
            value={preferences.contentWidth}
            onChange={(e) => onChange({ contentWidth: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </>
  )
}
