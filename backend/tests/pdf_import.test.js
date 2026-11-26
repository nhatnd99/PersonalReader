import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import app from '../src/app.js'
import prisma from '../src/config/database.js'
import { sanitizeHtml } from '../src/services/pdf/htmlSanitizer.js'
import { transformPagesToStructuredHtml } from '../src/services/pdf/htmlTransformer.js'
import { getActiveProcessingCount } from '../src/modules/books/bookImport.service.js'

/**
 * Generates a minimal valid multi-page PDF buffer in memory for testing PDF.js extraction.
 */
function buildTestPdfBuffer(pagesTextStreams) {
  const objects = []
  const addObj = (body) => {
    objects.push(body)
    return objects.length
  }

  // 1: Catalog, 2: Pages (placeholders)
  addObj('') // 1
  addObj('') // 2
  const fontId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  const pageIds = []
  for (const streamText of pagesTextStreams) {
    const contentId = addObj(`<< /Length ${Buffer.byteLength(streamText, 'latin1')} >>\nstream\n${streamText}\nendstream`)
    const pageId = addObj(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    )
    pageIds.push(pageId)
  }

  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'))
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
  }

  const xrefOffset = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}

test('Phase 2: In-Memory PDF Processing & Structured HTML Storage', async (t) => {
  let server
  let baseUrl
  let userToken
  let otherToken
  const testEmail = `pdf_user_${Date.now()}@readflow.dev`
  const otherEmail = `pdf_other_${Date.now()}@readflow.dev`

  await new Promise((resolve) => {
    server = http.createServer(app)
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`
      resolve()
    })
  })

  t.after(async () => {
    server.close()
    try {
      await prisma.user.deleteMany({ where: { email: { in: [testEmail, otherEmail] } } })
    } catch (_) {}
  })

  await t.test('HTML Sanitizer strips scripts, iframes, attributes, and keeps semantic tags', () => {
    const dirty =
      '<section class="evil" style="color:red"><h1 onclick="alert(1)">Title</h1><script>evil()</script><iframe src="x"></iframe><p>Hello <strong>World</strong>!</p></section>'
    const clean = sanitizeHtml(dirty)
    assert.ok(!clean.includes('<script'))
    assert.ok(!clean.includes('<iframe'))
    assert.ok(!clean.includes('onclick'))
    assert.ok(!clean.includes('style='))
    assert.strictEqual(clean, '<section><h1>Title</h1><p>Hello <strong>World</strong>!</p></section>')
  })

  await t.test('HTML Transformer detects chapters, paragraphs, lists, and strips repeated headers', () => {
    const samplePages = [
      {
        pageNumber: 1,
        items: [
          { str: 'My Book Header', x: 50, y: 760, fontSize: 10 },
          { str: 'Chapter 1: Getting Started', x: 50, y: 700, fontSize: 22 },
          { str: 'This is the first paragraph of our test book.', x: 50, y: 660, fontSize: 12 },
          { str: '- First bullet point', x: 60, y: 630, fontSize: 12 },
          { str: '- Second bullet point', x: 60, y: 610, fontSize: 12 },
        ],
      },
      {
        pageNumber: 2,
        items: [
          { str: 'My Book Header', x: 50, y: 760, fontSize: 10 },
          { str: 'Continuation on page two.', x: 50, y: 700, fontSize: 12 },
        ],
      },
      {
        pageNumber: 3,
        items: [
          { str: 'My Book Header', x: 50, y: 760, fontSize: 10 },
          { str: 'Final page thoughts.', x: 50, y: 700, fontSize: 12 },
        ],
      },
    ]

    const result = transformPagesToStructuredHtml(samplePages)
    assert.ok(result.chunks.length >= 1)
    assert.ok(result.chapters.length >= 1)
    assert.strictEqual(result.chapters[0].title, 'Chapter 1: Getting Started')
    assert.ok(result.chunks[0].contentHtml.includes('<h1>Chapter 1: Getting Started</h1>'))
    assert.ok(result.chunks[0].contentHtml.includes('<ul><li>First bullet point</li><li>Second bullet point</li></ul>'))
    assert.ok(!result.chunks[0].contentHtml.includes('My Book Header'))
  })

  await t.test('Setup: Register users and obtain JWTs', async () => {
    for (const [email, name] of [
      [testEmail, 'PDF Reader'],
      [otherEmail, 'Other Reader'],
    ]) {
      const reg = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Password123', displayName: name }),
      })
      assert.strictEqual(reg.status, 201)
    }

    const login1 = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'Password123' }),
    })
    userToken = (await login1.json()).accessToken

    const login2 = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otherEmail, password: 'Password123' }),
    })
    otherToken = (await login2.json()).accessToken
  })

  await t.test('POST /api/v1/books/import rejects unauthenticated request with 401', async () => {
    const form = new FormData()
    form.append('file', new Blob(['%PDF-1.4'], { type: 'application/pdf' }), 'test.pdf')
    const res = await fetch(`${baseUrl}/api/v1/books/import`, { method: 'POST', body: form })
    assert.strictEqual(res.status, 401)
  })

  await t.test('POST /api/v1/books/import rejects invalid non-PDF buffer with 400', async () => {
    const form = new FormData()
    form.append('file', new Blob(['NOT A REAL PDF FILE'], { type: 'application/pdf' }), 'fake.pdf')
    form.append('title', 'Fake Book')
    const res = await fetch(`${baseUrl}/api/v1/books/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: form,
    })
    assert.strictEqual(res.status, 400)
  })

  await t.test('POST /api/v1/books/import detects scanned/empty PDF as NEEDS_OCR (422)', async () => {
    const scannedPdf = buildTestPdfBuffer(['BT /F1 12 Tf 72 720 Td () Tj ET'])
    const form = new FormData()
    form.append('file', new Blob([scannedPdf], { type: 'application/pdf' }), 'scanned.pdf')
    form.append('title', 'Scanned Document')

    const res = await fetch(`${baseUrl}/api/v1/books/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: form,
    })
    assert.strictEqual(res.status, 422)
    const data = await res.json()
    assert.ok(data.error.includes('OCR'))
  })

  let importedBookId
  let importedJobId

  await t.test('POST /api/v1/books/import processes valid multi-page PDF in memory and persists HTML chunks', async () => {
    const page1 =
      'BT /F1 22 Tf 72 720 Td (Chapter 1: In-Memory Reading) Tj /F1 12 Tf 0 -30 Td (ReadFlow transforms uploaded PDF documents directly in server memory without disk or object storage.) Tj ET'
    const page2 =
      'BT /F1 12 Tf 72 720 Td (This is the second page with additional English vocabulary for learners to study.) Tj ET'
    const validPdf = buildTestPdfBuffer([page1, page2])

    const form = new FormData()
    form.append('file', new Blob([validPdf], { type: 'application/pdf' }), 'in_memory_guide.pdf')
    form.append('title', 'In-Memory Reading Guide')
    form.append('author', 'ReadFlow Team')
    form.append('language', 'English')

    const res = await fetch(`${baseUrl}/api/v1/books/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: form,
    })

    assert.strictEqual(res.status, 201)
    const data = await res.json()
    assert.strictEqual(data.book.processingStatus, 'COMPLETED')
    assert.strictEqual(data.book.status, 'ready')
    assert.strictEqual(data.book.totalPages, 2)
    assert.ok(data.book.totalWords >= 15)
    assert.strictEqual(data.job.status, 'COMPLETED')
    assert.strictEqual(data.job.progress, 100)
    assert.strictEqual(getActiveProcessingCount(), 0)

    importedBookId = data.book.id
    importedJobId = data.job.id
  })

  await t.test('GET /api/v1/books/:id/contents & /chapters return ordered sanitized HTML and enforce ownership', async () => {
    const contentsRes = await fetch(`${baseUrl}/api/v1/books/${importedBookId}/contents`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(contentsRes.status, 200)
    const contentsData = await contentsRes.json()
    assert.ok(contentsData.contents.length >= 1)
    assert.ok(contentsData.contents[0].contentHtml.includes('<h1>Chapter 1: In-Memory Reading</h1>'))
    assert.strictEqual(contentsData.contents[0].sourcePageStart, 1)
    assert.strictEqual(contentsData.contents[0].sourcePageEnd, 2)

    const chaptersRes = await fetch(`${baseUrl}/api/v1/books/${importedBookId}/chapters`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(chaptersRes.status, 200)
    const chaptersData = await chaptersRes.json()
    assert.strictEqual(chaptersData.chapters.length, 1)
    assert.strictEqual(chaptersData.chapters[0].title, 'Chapter 1: In-Memory Reading')

    // Cross-user access rejected with 403
    const forbiddenRes = await fetch(`${baseUrl}/api/v1/books/${importedBookId}/contents`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    })
    assert.strictEqual(forbiddenRes.status, 403)
  })

  await t.test('GET /api/v1/books/import/:jobId returns job metadata and enforces ownership', async () => {
    const jobRes = await fetch(`${baseUrl}/api/v1/books/import/${importedJobId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(jobRes.status, 200)
    const jobData = await jobRes.json()
    assert.strictEqual(jobData.job.status, 'COMPLETED')

    const forbiddenJobRes = await fetch(`${baseUrl}/api/v1/books/import/${importedJobId}`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    })
    assert.strictEqual(forbiddenJobRes.status, 403)
  })
})
