/**
 * In-Memory PDF Text & Layout Extractor using PDF.js (pdfjs-dist).
 * Never writes temporary files to disk or object storage.
 * Always destroys PDF.js document instances to release memory.
 */
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

const MAX_PDF_PAGES = parseInt(process.env.MAX_PDF_PAGES || '500', 10)
const MIN_TOTAL_CHARS_THRESHOLD = 40
const MIN_AVG_CHARS_PER_PAGE = 15

/**
 * Validates that the in-memory buffer starts with the %PDF- magic signature.
 * @param {Buffer|Uint8Array} buffer
 * @returns {boolean}
 */
export function hasPdfMagicHeader(buffer) {
  if (!buffer || buffer.length < 5) return false
  // Allow optional leading whitespace/BOM before %PDF- (some generators prepend a few bytes)
  const head = Buffer.from(buffer.subarray(0, Math.min(buffer.length, 64))).toString('latin1')
  return head.includes('%PDF-')
}

/**
 * Extracts text items with coordinates and font sizes from an in-memory PDF buffer.
 * @param {Buffer|Uint8Array} buffer
 * @param {Object} [options]
 * @param {Function} [options.onProgress] - Callback (percent, stepMessage)
 * @param {Function} [options.shouldCancel] - Async/sync check returning true if job cancelled
 * @returns {Promise<{ totalPages: number, pages?: Array, needsOcr: boolean, metadata?: Object }>}
 */
export async function extractPdfFromMemory(buffer, { onProgress, shouldCancel } = {}) {
  if (!hasPdfMagicHeader(buffer)) {
    const err = new Error('Invalid PDF file: missing %PDF- header signature.')
    err.status = 400
    err.code = 'INVALID_PDF'
    throw err
  }

  // Create Uint8Array view without duplicating underlying ArrayBuffer unnecessarily
  const uint8 = buffer instanceof Uint8Array
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer)

  const loadingTask = pdfjsLib.getDocument({
    data: uint8,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
    verbosity: 0,
  })

  let pdfDoc = null
  try {
    pdfDoc = await loadingTask.promise
    const totalPages = pdfDoc.numPages

    if (totalPages <= 0) {
      return { totalPages: 0, pages: [], needsOcr: true }
    }

    if (totalPages > MAX_PDF_PAGES) {
      const err = new Error(`PDF exceeds maximum allowed page limit (${MAX_PDF_PAGES} pages).`)
      err.status = 400
      err.code = 'PDF_TOO_MANY_PAGES'
      throw err
    }

    let docMetadata = null
    try {
      const meta = await pdfDoc.getMetadata()
      docMetadata = meta?.info || null
    } catch (_) {
      // Ignore optional metadata errors
    }

    const pages = []
    let totalExtractedChars = 0

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (shouldCancel && (await shouldCancel())) {
        const cancelErr = new Error('Processing cancelled by user.')
        cancelErr.code = 'JOB_CANCELLED'
        cancelErr.status = 499
        throw cancelErr
      }

      const page = await pdfDoc.getPage(pageNum)
      try {
        const textContent = await page.getTextContent()
        const items = (textContent.items || []).map((item) => {
          const t = item.transform || [12, 0, 0, 12, 0, 0]
          const fontSize = Math.hypot(t[0], t[1]) || 12
          totalExtractedChars += (item.str || '').trim().length
          return {
            str: item.str || '',
            x: t[4] || 0,
            y: t[5] || 0,
            fontSize,
            hasEOL: Boolean(item.hasEOL),
          }
        })

        pages.push({ pageNumber: pageNum, items })
      } finally {
        if (typeof page.cleanup === 'function') {
          page.cleanup()
        }
      }

      if (onProgress && (pageNum % 5 === 0 || pageNum === totalPages)) {
        const pct = Math.min(75, 15 + Math.round((pageNum / totalPages) * 60))
        await onProgress(pct, `Extracting text (page ${pageNum}/${totalPages})`)
      }
    }

    const avgChars = totalExtractedChars / totalPages
    if (totalExtractedChars < MIN_TOTAL_CHARS_THRESHOLD || avgChars < MIN_AVG_CHARS_PER_PAGE) {
      return {
        totalPages,
        pages: [],
        needsOcr: true,
        metadata: docMetadata,
      }
    }

    return {
      totalPages,
      pages,
      needsOcr: false,
      metadata: docMetadata,
    }
  } catch (err) {
    if (err.name === 'PasswordException') {
      const pwErr = new Error('Password-protected PDFs are not supported. Please unlock the PDF first.')
      pwErr.status = 400
      pwErr.code = 'PASSWORD_PROTECTED_PDF'
      throw pwErr
    }
    if (err.name === 'InvalidPDFException' || err.name === 'FormatError' || err.name === 'MissingPDFException') {
      const invalidErr = new Error('Corrupted or invalid PDF file.')
      invalidErr.status = 400
      invalidErr.code = 'INVALID_PDF'
      throw invalidErr
    }
    throw err
  } finally {
    if (pdfDoc) {
      try {
        await pdfDoc.destroy()
      } catch (_) {}
    }
    try {
      await loadingTask.destroy()
    } catch (_) {}
  }
}
