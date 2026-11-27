import React, { useMemo } from 'react'
import { sanitizeAndAnnotateChunkHtml } from '../utils/htmlParser.js'

const FONT_MAP = {
  serif: "Georgia, Cambria, 'Times New Roman', Times, serif",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
}

export default function ReaderContent({ contents = [], preferences, containerRef }) {
  const annotatedChunks = useMemo(() => {
    return contents.map((chunk) => ({
      ...chunk,
      renderedHtml: sanitizeAndAnnotateChunkHtml(chunk.contentHtml, chunk.sequence),
    }))
  }, [contents])

  const proseStyle = {
    '--reader-font-size': `${preferences.fontSize || 18}px`,
    '--reader-line-height': preferences.lineHeight || 1.75,
    '--reader-width': `${preferences.contentWidth || 720}px`,
    '--reader-font-family': FONT_MAP[preferences.fontFamily] || FONT_MAP.serif,
  }

  return (
    <div ref={containerRef} className="rf-reader-scroll">
      <article className="rf-reader-prose" style={proseStyle}>
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
