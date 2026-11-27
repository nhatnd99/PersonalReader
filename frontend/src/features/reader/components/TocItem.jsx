import React, { useState } from 'react'

export default function TocItem({
  node,
  depth = 0,
  activeEntryId,
  editMode,
  onSelect,
  onEdit,
  onAddSub,
  onDelete,
  onMove,
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0
  const isActive = node.id === activeEntryId

  return (
    <div>
      <div
        className={`rf-toc-item-row ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: `${0.55 + depth * 0.9}rem` }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((prev) => !prev)
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--r-muted)',
              cursor: 'pointer',
              fontSize: '0.7rem',
              width: '16px',
              padding: 0,
            }}
            aria-label={expanded ? 'Collapse section' : 'Expand section'}
          >
            {expanded ? '▼' : '▶'}
          </button>
        ) : (
          <span style={{ width: '16px', display: 'inline-block', fontSize: '0.65rem', color: 'var(--r-muted)' }}>•</span>
        )}

        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={node.title}
        >
          {node.title}
        </span>

        {node.sourceType === 'MANUAL' && !editMode && (
          <span style={{ fontSize: '0.62rem', color: 'var(--r-muted)', opacity: 0.75 }}>✎</span>
        )}

        {editMode && (
          <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onMove(node.id, 'up')}
              title="Move up"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--r-muted)' }}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => onMove(node.id, 'down')}
              title="Move down"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--r-muted)' }}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => onAddSub(node)}
              title="Add subsection"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--r-accent)' }}
            >
              +
            </button>
            <button
              type="button"
              onClick={() => onEdit(node)}
              title="Edit title"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--r-text)' }}
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={() => onDelete(node.id)}
              title="Delete entry"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: '#ef4444' }}
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <TocItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activeEntryId={activeEntryId}
              editMode={editMode}
              onSelect={onSelect}
              onEdit={onEdit}
              onAddSub={onAddSub}
              onDelete={onDelete}
              onMove={onMove}
            />
          ))}
        </div>
      )}
    </div>
  )
}
