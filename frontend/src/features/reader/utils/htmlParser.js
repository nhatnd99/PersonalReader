/**
 * Client-side defense-in-depth HTML sanitization and deterministic block ID injection.
 * Assigns data-block-id="block-s{sequence}-{idx}" and id="toc-s{sequence}-b{idx}"
 * so IntersectionObserver and TOC anchors map reliably across all screen sizes.
 */

const ALLOWED_TAGS = new Set([
  'section',
  'h1',
  'h2',
  'h3',
  'h4',
  'p',
  'ul',
  'ol',
  'li',
  'blockquote',
  'strong',
  'em',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
])

export function sanitizeAndAnnotateChunkHtml(rawHtml, sequence) {
  if (!rawHtml) return ''

  // Strip dangerous tags/attributes as defense-in-depth
  let safe = String(rawHtml)
    .replace(/<\s*(script|style|iframe|object|embed|svg|noscript)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|svg|img|link|meta)\b[^>]*\/?>/gi, '')
    .replace(/<\s*(\/?)\s*([a-zA-Z0-9]+)(?:\s+[^>]*)?\s*>/g, (_m, slash, tag) => {
      const lower = tag.toLowerCase()
      if (!ALLOWED_TAGS.has(lower)) return ''
      return slash ? `</${lower}>` : `<${lower}>`
    })
    .replace(/javascript\s*:/gi, '')

  // Annotate top-level block elements with deterministic block IDs & heading anchor IDs
  let blockIdx = 0
  safe = safe.replace(/<(h[1-4]|p|ul|ol|blockquote|table)>/gi, (_m, tag) => {
    const lower = tag.toLowerCase()
    const blockId = `block-s${sequence}-${blockIdx}`
    const anchorAttr = lower.startsWith('h') ? ` id="toc-s${sequence}-b${blockIdx}"` : ''
    blockIdx++
    return `<${lower}${anchorAttr} data-block-id="${blockId}" data-sequence="${sequence}">`
  })

  return safe
}
