/**
 * Reflow-safe Logical Text Anchoring & Highlight Restoration Utilities.
 * Works across font changes, viewport resizes, and multiple text nodes without mutating stored HTML.
 */

function findEnclosingBlock(node, proseEl) {
  let curr = node?.nodeType === 3 ? node.parentElement : node
  while (curr && curr !== proseEl) {
    if (curr.hasAttribute && curr.hasAttribute('data-block-id')) {
      return curr
    }
    curr = curr.parentElement
  }
  return null
}

function getOffsetInBlock(blockEl, targetNode, targetOffset) {
  const walker = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT)
  let total = 0
  let node
  while ((node = walker.nextNode())) {
    if (node === targetNode) {
      return total + targetOffset
    }
    total += node.nodeValue.length
  }
  return total
}

function extractSurroundingSentences(blockText, startOffset, endOffset) {
  if (!blockText) return { sentence: '', previousSentence: '', nextSentence: '' }
  // Split into sentence spans with start/end indices
  const sentenceRegex = /[^.!?]+[.!?]+["”']?|[^.!?]+$/g
  const sentences = []
  let m
  while ((m = sentenceRegex.exec(blockText)) !== null) {
    const trimmed = m[0].trim()
    if (trimmed) {
      sentences.push({
        text: trimmed,
        start: m.index,
        end: m.index + m[0].length,
      })
    }
  }

  if (sentences.length === 0) {
    return { sentence: blockText.slice(0, 500), previousSentence: '', nextSentence: '' }
  }

  let idx = sentences.findIndex((s) => startOffset >= s.start && startOffset <= s.end)
  if (idx === -1) idx = 0

  return {
    sentence: sentences[idx]?.text || '',
    previousSentence: idx > 0 ? sentences[idx - 1].text : '',
    nextSentence: idx < sentences.length - 1 ? sentences[idx + 1].text : '',
  }
}

/**
 * Creates a logical text anchor and surrounding context from the active browser Selection.
 */
export function createAnchorFromSelection(proseEl) {
  if (!proseEl) return null
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null

  const range = sel.getRangeAt(0)
  const selectedText = sel.toString().trim()
  if (!selectedText) return null

  if (!proseEl.contains(range.commonAncestorContainer)) return null

  const startBlock = findEnclosingBlock(range.startContainer, proseEl)
  const endBlock = findEnclosingBlock(range.endContainer, proseEl) || startBlock
  if (!startBlock) return null

  const startBlockId = startBlock.getAttribute('data-block-id')
  const endBlockId = endBlock.getAttribute('data-block-id')
  const contentSequence = parseInt(startBlock.getAttribute('data-sequence') || '1', 10)

  const startOffset = getOffsetInBlock(startBlock, range.startContainer, range.startOffset)
  const endOffset =
    startBlock === endBlock
      ? getOffsetInBlock(startBlock, range.endContainer, range.endOffset)
      : startBlock.textContent.length

  const blockText = startBlock.textContent || ''
  const prefixContext = blockText.slice(Math.max(0, startOffset - 40), startOffset)
  const suffixContext = blockText.slice(endOffset, Math.min(blockText.length, endOffset + 40))

  const { sentence, previousSentence, nextSentence } = extractSurroundingSentences(
    blockText,
    startOffset,
    endOffset
  )

  return {
    selectedText,
    rect: range.getBoundingClientRect(),
    anchorData: {
      contentSequence,
      startBlockId,
      endBlockId,
      startOffset,
      endOffset,
      selectedText,
      prefixContext,
      suffixContext,
    },
    context: {
      sentence,
      previousSentence,
      nextSentence,
      surroundingParagraph: blockText.slice(0, 1500),
    },
  }
}

/**
 * Resolves [startOffset, endOffset] inside a block element using exact offset first,
 * then prefix+text+suffix context, then text fallback.
 */
export function resolveTextOffsetsInBlock(blockText, anchorData) {
  const target = anchorData?.selectedText || ''
  if (!target || !blockText) return null

  const { startOffset = 0, endOffset = 0, prefixContext = '', suffixContext = '' } = anchorData

  // 1. Exact offset match
  if (endOffset > startOffset && blockText.slice(startOffset, endOffset).trim() === target.trim()) {
    return { start: startOffset, end: endOffset }
  }

  // 2. Context-assisted match (prefix + target + suffix)
  if (prefixContext || suffixContext) {
    const composite = `${prefixContext}${target}${suffixContext}`
    const compIdx = blockText.indexOf(composite)
    if (compIdx !== -1) {
      const start = compIdx + prefixContext.length
      return { start, end: start + target.length }
    }
  }

  // 3. Direct substring fallback within the same block
  const idx = blockText.indexOf(target)
  if (idx !== -1) {
    return { start: idx, end: idx + target.length }
  }

  return null
}

/**
 * Unwraps existing highlight <mark> tags and re-applies persisted highlights to the DOM.
 */
export function applyHighlightsToContainer(proseEl, highlights = []) {
  if (!proseEl) return

  // 1. Clean existing marks
  const existingMarks = proseEl.querySelectorAll('mark[data-highlight-id]')
  existingMarks.forEach((mark) => {
    const parent = mark.parentNode
    if (!parent) return
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark)
    }
    parent.removeChild(mark)
    parent.normalize()
  })

  if (!highlights || highlights.length === 0) return

  // 2. Apply each highlight safely
  for (const hl of highlights) {
    const anchor = hl.anchorData
    if (!anchor?.startBlockId) continue

    const blockEl = proseEl.querySelector(`[data-block-id="${anchor.startBlockId}"]`)
    if (!blockEl) continue

    const resolved = resolveTextOffsetsInBlock(blockEl.textContent || '', {
      ...anchor,
      selectedText: hl.selectedText || anchor.selectedText,
    })
    if (!resolved) continue

    wrapRangeInBlock(blockEl, resolved.start, resolved.end, hl.id, hl.color || 'yellow')
  }
}

function wrapRangeInBlock(blockEl, start, end, highlightId, color) {
  const walker = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT)
  const nodesToWrap = []
  let pos = 0
  let node

  while ((node = walker.nextNode())) {
    const len = node.nodeValue.length
    const nodeStart = pos
    const nodeEnd = pos + len
    pos = nodeEnd

    if (nodeEnd <= start) continue
    if (nodeStart >= end) break

    const localStart = Math.max(0, start - nodeStart)
    const localEnd = Math.min(len, end - nodeStart)
    if (localEnd > localStart) {
      nodesToWrap.push({ node, localStart, localEnd })
    }
  }

  for (const item of nodesToWrap) {
    const { node: textNode, localStart, localEnd } = item
    const range = document.createRange()
    range.setStart(textNode, localStart)
    range.setEnd(textNode, localEnd)

    const mark = document.createElement('mark')
    mark.className = `rf-highlight rf-hl-${color}`
    mark.setAttribute('data-highlight-id', highlightId)
    try {
      range.surroundContents(mark)
    } catch (_) {
      // Skip if partial inline boundary cannot be surrounded cleanly
    }
  }
}
