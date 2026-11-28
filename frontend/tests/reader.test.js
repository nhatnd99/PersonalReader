import { describe, it, expect } from 'vitest'
import { sanitizeAndAnnotateChunkHtml } from '../src/features/reader/utils/htmlParser.js'
import { buildTocTree } from '../src/features/reader/utils/tocGenerator.js'
import { calculateReadingPercentage } from '../src/features/reader/utils/progressCalculator.js'
import { resolveTextOffsetsInBlock } from '../src/features/reader/utils/textAnchor.js'

describe('Phase 3 Frontend Reader Utilities', () => {
  it('sanitizes HTML and injects deterministic block & anchor IDs', () => {
    const raw = '<section><h1>Chapter 1</h1><script>alert(1)</script><p onclick="x()">Hello <strong>Reader</strong></p></section>'
    const result = sanitizeAndAnnotateChunkHtml(raw, 2)

    expect(result).not.toContain('<script')
    expect(result).not.toContain('onclick')
    expect(result).toContain('<h1 id="toc-s2-b0" data-block-id="block-s2-0" data-sequence="2">Chapter 1</h1>')
    expect(result).toContain('<p data-block-id="block-s2-1" data-sequence="2">Hello <strong>Reader</strong></p>')
  })

  it('builds hierarchical TOC tree from flat backend entries', () => {
    const flat = [
      { id: 'c1', parentId: null, title: 'Chapter 1', level: 1 },
      { id: 'c1-1', parentId: 'c1', title: '1.1 Overview', level: 2 },
      { id: 'c1-1-1', parentId: 'c1-1', title: '1.1.1 Details', level: 3 },
      { id: 'c2', parentId: null, title: 'Chapter 2', level: 1 },
    ]

    const tree = buildTocTree(flat)
    expect(tree.length).toBe(2)
    expect(tree[0].children.length).toBe(1)
    expect(tree[0].children[0].children.length).toBe(1)
    expect(tree[0].children[0].children[0].title).toBe('1.1.1 Details')
  })

  it('calculates content-weighted reading percentage accurately across chunks', () => {
    const contents = [
      { sequence: 1, wordCount: 500 },
      { sequence: 2, wordCount: 500 },
    ]

    expect(calculateReadingPercentage(contents, 1, 0)).toBe(0)
    expect(calculateReadingPercentage(contents, 1, 0.5)).toBe(25)
    expect(calculateReadingPercentage(contents, 2, 0)).toBe(50)
    expect(calculateReadingPercentage(contents, 2, 1)).toBe(100)
  })

  it('resolves logical text anchors across exact offsets, context fallback, and rejects missing text', () => {
    const blockText = 'He was put in charge of the company financial operations.'
    // Exact offset
    expect(
      resolveTextOffsetsInBlock(blockText, {
        selectedText: 'in charge of',
        startOffset: 11,
        endOffset: 23,
      })
    ).toEqual({ start: 11, end: 23 })

    // Context fallback when offsets shifted
    expect(
      resolveTextOffsetsInBlock(blockText, {
        selectedText: 'in charge of',
        startOffset: 0,
        endOffset: 5,
        prefixContext: 'put ',
        suffixContext: ' the',
      })
    ).toEqual({ start: 11, end: 23 })

    // Missing text safely returns null
    expect(
      resolveTextOffsetsInBlock(blockText, {
        selectedText: 'nonexistent phrase',
        startOffset: 0,
        endOffset: 5,
      })
    ).toBeNull()
  })
})
