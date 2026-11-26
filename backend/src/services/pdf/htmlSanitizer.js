/**
 * Server-side deterministic HTML Sanitizer for extracted PDF content.
 * Allows only safe semantic reading tags with zero attributes, scripts, or inline styles.
 */

const ALLOWED_TAGS = new Set([
  'section',
  'h1',
  'h2',
  'h3',
  'p',
  'ul',
  'ol',
  'li',
  'blockquote',
  'strong',
  'em',
])

/**
 * Escapes HTML special characters in plain text nodes.
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Sanitizes an HTML string by stripping disallowed tags (including script/iframe/style)
 * and stripping all attributes from allowed semantic tags.
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHtml(html) {
  if (!html) return ''

  // 1. Remove dangerous blocks completely (script, style, iframe, object, embed, svg)
  let cleaned = String(html).replace(
    /<\s*(script|style|iframe|object|embed|svg|noscript)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    ''
  )

  // 2. Remove any self-closing dangerous tags
  cleaned = cleaned.replace(
    /<\s*(script|style|iframe|object|embed|svg|img|link|meta)\b[^>]*\/?>/gi,
    ''
  )

  // 3. Filter remaining tags: keep only ALLOWED_TAGS, strip all attributes (no onclick, href, style)
  cleaned = cleaned.replace(/<\s*(\/?)\s*([a-zA-Z0-9]+)(?:\s+[^>]*)?\s*>/g, (match, slash, tagName) => {
    const lower = tagName.toLowerCase()
    if (!ALLOWED_TAGS.has(lower)) {
      return ''
    }
    return slash ? `</${lower}>` : `<${lower}>`
  })

  // 4. Neutralize any leftover javascript: or data: URIs in text
  cleaned = cleaned.replace(/javascript\s*:/gi, '')

  return cleaned.trim()
}
