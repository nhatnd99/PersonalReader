import React, { useState } from 'react'

export default function VocabularyLookupPopup({
  isOpen,
  isLoading,
  errorMessage,
  lookupResult,
  onClose,
  onRetry,
  onSaveToVocabulary,
  onAddNote,
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [saveError, setSaveError] = useState('')

  if (!isOpen) return null

  const handleSpeak = () => {
    if (!lookupResult?.word || typeof window === 'undefined' || !window.speechSynthesis) return
    const utter = new SpeechSynthesisUtterance(lookupResult.word)
    utter.lang = 'en-US'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utter)
  }

  const handleSave = async () => {
    if (!lookupResult) return
    setIsSaving(true)
    setSaveError('')
    setSavedMsg('')
    try {
      await onSaveToVocabulary(lookupResult)
      setSavedMsg('Saved to Vocabulary!')
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || 'Could not save vocabulary.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rf-vocab-popup" role="dialog" aria-label="Contextual Vocabulary Lookup">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
        <div>
          <strong style={{ fontSize: '1.05rem' }}>
            {lookupResult?.word || 'Vocabulary Lookup'}
          </strong>
          {lookupResult?.partOfSpeech && (
            <span style={{ marginLeft: '0.5rem', fontSize: '0.78rem', color: 'var(--r-muted)', fontStyle: 'italic' }}>
              ({lookupResult.partOfSpeech})
            </span>
          )}
          {lookupResult?.pronunciation && (
            <div style={{ fontSize: '0.82rem', color: 'var(--r-muted)', marginTop: '0.15rem' }}>
              {lookupResult.pronunciation}
              <button
                type="button"
                onClick={handleSpeak}
                title="Pronounce"
                style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '0.35rem' }}
              >
                🔊
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close lookup"
          style={{ background: 'none', border: 'none', fontSize: '1.35rem', cursor: 'pointer', color: 'var(--r-muted)' }}
        >
          ×
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '1rem 0', fontSize: '0.88rem', color: 'var(--r-muted)' }}>
          Analyzing context & translating…
        </div>
      ) : errorMessage ? (
        <div style={{ padding: '0.65rem', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.84rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>{errorMessage}</div>
          <button type="button" className="rf-reader-btn" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : lookupResult ? (
        <>
          <div style={{ marginBottom: '0.65rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--r-accent)', textTransform: 'uppercase' }}>
              Contextual Meaning (Vietnamese)
            </div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, marginTop: '0.15rem' }}>
              {lookupResult.vietnameseMeaning}
            </div>
            {lookupResult.contextualMeaning && (
              <p style={{ fontSize: '0.84rem', color: 'var(--r-text)', margin: '0.35rem 0 0 0', lineHeight: 1.45 }}>
                {lookupResult.contextualMeaning}
              </p>
            )}
          </div>

          {lookupResult.generalMeaning && (
            <div style={{ marginBottom: '0.65rem', fontSize: '0.8rem', color: 'var(--r-muted)' }}>
              <strong>General meaning:</strong> {lookupResult.generalMeaning}
            </div>
          )}

          {lookupResult.exampleSentence && (
            <div
              style={{
                padding: '0.55rem 0.7rem',
                borderRadius: '6px',
                backgroundColor: 'var(--r-bg)',
                borderLeft: '3px solid var(--r-accent)',
                fontSize: '0.8rem',
                fontStyle: 'italic',
                marginBottom: '0.85rem',
              }}
            >
              “{lookupResult.exampleSentence}”
            </div>
          )}

          {savedMsg && (
            <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, marginBottom: '0.5rem' }}>
              ✓ {savedMsg}
            </div>
          )}
          {saveError && (
            <div style={{ fontSize: '0.8rem', color: '#ef4444', marginBottom: '0.5rem' }}>
              {saveError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={isSaving || Boolean(savedMsg)}
              onClick={handleSave}
              style={{
                flex: 1,
                minHeight: '38px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--r-accent)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: isSaving || savedMsg ? 'default' : 'pointer',
              }}
            >
              {isSaving ? 'Saving…' : savedMsg ? 'Saved ✓' : '+ Save to Vocabulary'}
            </button>
            <button
              type="button"
              className="rf-reader-btn"
              onClick={() => onAddNote(lookupResult)}
            >
              📝 Add Note
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
