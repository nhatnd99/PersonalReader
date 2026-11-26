/**
 * Deterministic PDF-to-Structured-HTML Transformation Layer.
 * Analyzes font sizes, line positions, repeated headers/footers, lists, and paragraph breaks
 * to produce ordered, sanitized HTML chunks and detected chapters for Reflow Reading.
 */
import { escapeHtml, sanitizeHtml } from './htmlSanitizer.js'

const TARGET_CHUNK_WORDS = 800
const MAX_CHUNK_WORDS = 1400

/**
 * Groups raw PDF.js text items on a page into visual lines ordered top-to-bottom, left-to-right.
 */
function groupItemsIntoLines(items) {
  if (!items || items.length === 0) return []

  // Sort top-to-bottom (higher Y is higher on PDF page), then left-to-right (lower X)
  const sorted = [...items]
    .filter((item) => item.str && item.str.trim().length > 0)
    .sort((a, b) => {
      const yDiff = b.y - a.y
      if (Math.abs(yDiff) > 3) return yDiff
      return a.x - b.x
    })

  const lines = []
  let currentLine = null

  for (const item of sorted) {
    if (!currentLine || Math.abs(item.y - currentLine.y) > 4) {
      if (currentLine) lines.push(currentLine)
      currentLine = {
        y: item.y,
        x: item.x,
        fontSize: item.fontSize || 12,
        parts: [item.str],
      }
    } else {
      currentLine.parts.push(item.str)
      if (item.fontSize > currentLine.fontSize) {
        currentLine.fontSize = item.fontSize
      }
    }
  }

  if (currentLine) lines.push(currentLine)

  return lines.map((l) => ({
    y: l.y,
    x: l.x,
    fontSize: l.fontSize,
    text: l.parts.join(' ').replace(/\s+/g, ' ').trim(),
  }))
}

/**
 * Computes median font size across all lines to identify body text size.
 */
function computeMedianFontSize(pagesLines) {
  const sizes = []
  for (const lines of pagesLines) {
    for (const line of lines) {
      if (line.text.length >= 10 && line.fontSize > 0) {
        sizes.push(Math.round(line.fontSize * 10) / 10)
      }
    }
  }
  if (sizes.length === 0) return 12
  sizes.sort((a, b) => a - b)
  return sizes[Math.floor(sizes.length / 2)]
}

/**
 * Detects repeated headers/footers (e.g. page numbers or running book titles on >= 40% of pages).
 */
function detectRepeatedHeadersFooters(pagesLines) {
  if (pagesLines.length < 3) return new Set()

  const freq = new Map()
  for (const lines of pagesLines) {
    if (lines.length === 0) continue
    const candidates = [lines[0], lines[lines.length - 1]]
    const seenOnPage = new Set()
    for (const c of candidates) {
      if (!c) continue
      // Normalize digits so "Page 1", "Page 2" match
      const normalized = c.text.replace(/\d+/g, '#').trim()
      if (normalized.length > 0 && normalized.length <= 80 && !seenOnPage.has(normalized)) {
        seenOnPage.add(normalized)
        freq.set(normalized, (freq.get(normalized) || 0) + 1)
      }
    }
  }

  const threshold = Math.max(3, Math.ceil(pagesLines.length * 0.4))
  const repeated = new Set()
  for (const [key, count] of freq.entries()) {
    if (count >= threshold) repeated.add(key)
  }
  return repeated
}

function isBulletLine(text) {
  return /^([•●◦▪▫\-*]|\d+[.)])\s+/.test(text)
}

function isOrderedListLine(text) {
  return /^\d+[.)]\s+/.test(text)
}

function stripListMarker(text) {
  return text.replace(/^([•●◦▪▫\-*]|\d+[.)])\s+/, '').trim()
}

function countWords(text) {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Transforms extracted pages into semantic HTML chunks and detected chapters.
 * @param {Array<{ pageNumber: number, items: Array }>} pages
 * @returns {{ chunks: Array, chapters: Array, totalWords: number }}
 */
export function transformPagesToStructuredHtml(pages) {
  const pagesLines = pages.map((p) => groupItemsIntoLines(p.items))
  const medianFont = computeMedianFontSize(pagesLines)
  const repeatedHeaders = detectRepeatedHeadersFooters(pagesLines)

  const blocks = []

  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    const pageNumber = pages[pIdx].pageNumber
    const lines = pagesLines[pIdx]

    let paragraphBuf = []
    let listType = null // 'ul' | 'ol' | null
    let listItems = []

    const flushParagraph = () => {
      if (paragraphBuf.length === 0) return
      const joined = paragraphBuf.join(' ').replace(/\s+/g, ' ').trim()
      if (joined) {
        blocks.push({
          type: 'p',
          text: joined,
          html: `<p>${escapeHtml(joined)}</p>`,
          pageNumber,
        })
      }
      paragraphBuf = []
    }

    const flushList = () => {
      if (!listType || listItems.length === 0) return
      const tag = listType
      const itemsHtml = listItems.map((li) => `<li>${escapeHtml(li)}</li>`).join('')
      blocks.push({
        type: tag,
        text: listItems.join('\n'),
        html: `<${tag}>${itemsHtml}</${tag}>`,
        pageNumber,
      })
      listType = null
      listItems = []
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const text = line.text

      // Skip pure page numbers or repeated headers/footers
      if (/^\d{1,4}$/.test(text)) continue
      const normalized = text.replace(/\d+/g, '#').trim()
      if ((i === 0 || i === lines.length - 1) && repeatedHeaders.has(normalized)) {
        continue
      }

      const ratio = line.fontSize / (medianFont || 12)
      const isChapterPattern = /^(chapter|part|section)\s+([0-9]+|[ivxlcdm]+)\b/i.test(text)

      // Detect headings
      if ((ratio >= 1.45 || (isChapterPattern && text.length < 90)) && text.length <= 140) {
        flushParagraph()
        flushList()
        blocks.push({
          type: 'h1',
          text,
          html: `<h1>${escapeHtml(text)}</h1>`,
          pageNumber,
        })
        continue
      }

      if (ratio >= 1.22 && text.length <= 140) {
        flushParagraph()
        flushList()
        blocks.push({
          type: 'h2',
          text,
          html: `<h2>${escapeHtml(text)}</h2>`,
          pageNumber,
        })
        continue
      }

      if (ratio >= 1.1 && text.length <= 100 && !/[.,;]$/.test(text)) {
        flushParagraph()
        flushList()
        blocks.push({
          type: 'h3',
          text,
          html: `<h3>${escapeHtml(text)}</h3>`,
          pageNumber,
        })
        continue
      }

      // Detect lists
      if (isBulletLine(text)) {
        flushParagraph()
        const detectedType = isOrderedListLine(text) ? 'ol' : 'ul'
        if (listType && listType !== detectedType) {
          flushList()
        }
        listType = detectedType
        listItems.push(stripListMarker(text))
        continue
      }

      flushList()
      paragraphBuf.push(text)

      // Heuristic paragraph break if line ends with sentence punctuation and is shorter than typical full line
      const endsSentence = /[.!?]["”']?$/.test(text)
      if (endsSentence && text.length < 62) {
        flushParagraph()
      }
    }

    flushParagraph()
    flushList()
  }

  // Group blocks into ordered BookContent chunks without splitting paragraphs
  const chunks = []
  const chapters = []
  let currentBlocks = []
  let currentWords = 0
  let totalWords = 0

  const finalizeChunk = () => {
    if (currentBlocks.length === 0) return
    const sequence = chunks.length + 1
    const rawHtml = `<section>${currentBlocks.map((b) => b.html).join('\n')}</section>`
    const contentHtml = sanitizeHtml(rawHtml)
    const plainText = currentBlocks.map((b) => b.text).join('\n\n')
    const sourcePageStart = currentBlocks[0].pageNumber
    const sourcePageEnd = currentBlocks[currentBlocks.length - 1].pageNumber
    const wordCount = countWords(plainText)

    // Record chapters whose headings landed in this chunk
    for (const b of currentBlocks) {
      if (b.type === 'h1' || b.type === 'h2') {
        if (chapters.length > 0) {
          chapters[chapters.length - 1].endContentSequence = Math.max(
            chapters[chapters.length - 1].startContentSequence,
            sequence - 1
          )
        }
        chapters.push({
          title: b.text.slice(0, 200),
          sequence: chapters.length + 1,
          startContentSequence: sequence,
          endContentSequence: sequence,
        })
      }
    }

    chunks.push({
      sequence,
      contentHtml,
      plainText,
      sourcePageStart,
      sourcePageEnd,
      wordCount,
    })

    totalWords += wordCount
    currentBlocks = []
    currentWords = 0
  }

  for (const block of blocks) {
    const blockWords = countWords(block.text)
    if (
      currentBlocks.length > 0 &&
      (currentWords + blockWords > MAX_CHUNK_WORDS ||
        (currentWords >= TARGET_CHUNK_WORDS && (block.type === 'h1' || block.type === 'h2')))
    ) {
      finalizeChunk()
    }
    currentBlocks.push(block)
    currentWords += blockWords
  }
  finalizeChunk()

  // Close final chapter range
  if (chapters.length > 0 && chunks.length > 0) {
    chapters[chapters.length - 1].endContentSequence = chunks[chunks.length - 1].sequence
  }

  return { chunks, chapters, totalWords }
}
