import React from 'react'

const COLORS = [
  { id: 'yellow', hex: '#facc15', label: 'Yellow' },
  { id: 'green', hex: '#4ade80', label: 'Green' },
  { id: 'blue', hex: '#60a5fa', label: 'Blue' },
  { id: 'pink', hex: '#f472b6', label: 'Pink' },
  { id: 'purple', hex: '#c084fc', label: 'Purple' },
]

export default function SelectionToolbar({
  selection, // { selectedText, rect, anchorData, context }
  activeHighlight, // { id, color, rect, selectedText, anchorData } when clicking existing highlight
  onHighlight,
  onChangeHighlightColor,
  onDeleteHighlight,
  onLookUp,
  onAddNote,
  onBookmark,
}) {
  const targetRect = activeHighlight?.rect || selection?.rect
  if (!targetRect) return null

  // Position cleanly above selection (or below if near top of viewport)
  const topAbove = targetRect.top - 48
  const top = topAbove > 12 ? topAbove : Math.min(window.innerHeight - 60, targetRect.bottom + 8)
  const left = Math.min(Math.max(8, targetRect.left), Math.max(8, window.innerWidth - 330))

  if (activeHighlight) {
    return (
      <div
        className="rf-selection-toolbar"
        style={{ top: `${top}px`, left: `${left}px` }}
        onMouseDown={(e) => e.preventDefault()}
      >
        {COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            className="rf-hl-dot"
            style={{
              backgroundColor: c.hex,
              outline: activeHighlight.color === c.id ? '2px solid #fff' : 'none',
            }}
            title={`Change to ${c.label}`}
            onClick={() => onChangeHighlightColor(activeHighlight.id, c.id)}
          />
        ))}
        <button
          type="button"
          className="rf-toolbar-action"
          onClick={() => onAddNote(activeHighlight)}
        >
          📝 Note
        </button>
        <button
          type="button"
          className="rf-toolbar-action"
          style={{ color: '#fca5a5' }}
          onClick={() => onDeleteHighlight(activeHighlight.id)}
        >
          🗑️ Remove
        </button>
      </div>
    )
  }

  return (
    <div
      className="rf-selection-toolbar"
      style={{ top: `${top}px`, left: `${left}px` }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          className="rf-hl-dot"
          style={{ backgroundColor: c.hex }}
          title={`Highlight ${c.label}`}
          onClick={() => onHighlight(c.id)}
        />
      ))}
      <button type="button" className="rf-toolbar-action" onClick={onLookUp}>
        🔍 Look Up
      </button>
      <button type="button" className="rf-toolbar-action" onClick={() => onAddNote(selection)}>
        📝 Note
      </button>
      <button type="button" className="rf-toolbar-action" onClick={onBookmark}>
        🔖 Bookmark
      </button>
    </div>
  )
}
