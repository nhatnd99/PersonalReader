import React, { useMemo, useEffect, useRef } from 'react'
import { sanitizeAndAnnotateChunkHtml } from '../utils/htmlParser.js'
import { createAnchorFromSelection, applyHighlightsToContainer } from '../utils/textAnchor.js'

const FONT_MAP = {
  serif: "Georgia, Cambria, 'Times New Roman', Times, serif",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
}

export default function ReaderContent({
  contents = [],
  preferences,
  containerRef,
  highlights = [],
  onSelectionChange,
  onClickHighlight,
}) {
  const proseRef = useRef(null)

  const annotatedChunks = useMemo(() => {
    return contents.map((chunk) => ({
      ...chunk,
      renderedHtml: sanitizeAndAnnotateChunkHtml(chunk.contentHtml, chunk.sequence),
    }))
  }, [contents])

  // Restore persisted highlights whenever chunks or highlights list changes
  useEffect(() => {
    applyHighlightsToContainer(proseRef.current, highlights)
  }, [annotatedChunks, highlights])

  // Handle mouse & touch text selection
  useEffect(() => {
    const proseEl = proseRef.current
    if (!proseEl || !onSelectionChange) return

    const handleSelectEnd = () => {
      // Slight delay so mobile selection handles settle
      setTimeout(() => {
        const anchor = createAnchorFromSelection(proseEl)
        onSelectionChange(anchor)
      }, 20)
    }

    const handleMouseDown = (e) => {
      if (e.target.closest && e.target.closest('mark[data-highlight-id]')) {
        return
      }
      onSelectionChange(null)
    }

    proseEl.addEventListener('mouseup', handleSelectEnd)
    proseEl.addEventListener('touchend', handleSelectEnd)
    proseEl.addEventListener('mousedown', handleMouseDown)

    return () => {
      proseEl.removeEventListener('mouseup', handleSelectEnd)
      proseEl.removeEventListener('touchend', handleSelectEnd)
      proseEl.removeEventListener('mousedown', handleMouseDown)
    }
  }, [onSelectionChange])

  const handleProseClick = (e) => {
    const mark = e.target.closest ? e.target.closest('mark[data-highlight-id]') : null
    if (mark && onClickHighlight) {
      const hlId = mark.getAttribute('data-highlight-id')
      const found = highlights.find((h) => h.id === hlId)
      if (found) {
        onClickHighlight({
          ...found,
          rect: mark.getBoundingClientRect(),
        })
      }
    }
  }

  const proseStyle = {
    '--reader-font-size': `${preferences.fontSize || 18}px`,
    '--reader-line-height': preferences.lineHeight || 1.75,
    '--reader-width': `${preferences.contentWidth || 720}px`,
    '--reader-font-family': FONT_MAP[preferences.fontFamily] || FONT_MAP.serif,
  }

  return (
    <div ref={containerRef} className="rf-reader-scroll">
      <article ref={proseRef} className="rf-reader-prose" style={proseStyle} onClick={handleProseClick}>
        {annotatedChunks.length === 0 ? (
          <p style={{ color: 'var(--r-muted)', textAlign: 'center', marginTop: '3rem' }}>
            No readable content found for this book.
          </p>
        ) : (
          annotatedChunks.map((chunk) => (
            <div
              key={chunk.id || chunk.sequence}
              data-chunk-sequence={chunk.sequence}
              dangerouslySetInnerHTML={{ __html: chunk.renderedHtml }}
            />
          ))
        )}
      </article>
    </div>
  )
}
