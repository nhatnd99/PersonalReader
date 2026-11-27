import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import app from '../src/app.js'
import prisma from '../src/config/database.js'
import { extractHeadingsFromContents } from '../src/modules/reader/toc.service.js'

function buildSamplePdfBuffer() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [4 0 R] /Count 1 >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>',
  ]
  const stream =
    'BT /F1 22 Tf 72 720 Td (Chapter 1: Foundations) Tj /F1 16 Tf 0 -30 Td (1.1 Core Concepts) Tj /F1 12 Tf 0 -25 Td (Reading structured HTML across devices allows responsive reflow typography and reliable progress tracking.) Tj ET'
  objects.push(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`)

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

test('Phase 3: Reader, Table of Contents, Progress & Sync API Suite', async (t) => {
  let server
  let baseUrl
  let userToken
  let otherToken
  let bookId

  const userEmail = `p3_user_${Date.now()}@readflow.dev`
  const otherEmail = `p3_other_${Date.now()}@readflow.dev`

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
      await prisma.user.deleteMany({ where: { email: { in: [userEmail, otherEmail] } } })
    } catch (_) {}
  })

  await t.test('Unit: extractHeadingsFromContents extracts hierarchical anchors deterministically', () => {
    const headings = extractHeadingsFromContents([
      {
        sequence: 1,
        contentHtml: '<section><h1>Chapter 1</h1><p>Intro</p><h2>Section 1.1</h2><h3>Sub 1.1.1</h3></section>',
      },
    ])
    assert.strictEqual(headings.length, 3)
    assert.strictEqual(headings[0].level, 1)
    assert.strictEqual(headings[0].contentBlockId, 'block-s1-0')
    assert.strictEqual(headings[1].level, 2)
    assert.strictEqual(headings[1].contentBlockId, 'block-s1-2')
    assert.strictEqual(headings[2].level, 3)
  })

  await t.test('Setup: Register users and import a sample PDF book', async () => {
    for (const [email, displayName] of [
      [userEmail, 'Reader One'],
      [otherEmail, 'Reader Two'],
    ]) {
      const reg = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Password123', displayName }),
      })
      assert.strictEqual(reg.status, 201)
    }

    userToken = (
      await (
        await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, password: 'Password123' }),
        })
      ).json()
    ).accessToken

    otherToken = (
      await (
        await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: otherEmail, password: 'Password123' }),
        })
      ).json()
    ).accessToken

    const form = new FormData()
    form.append('file', new Blob([buildSamplePdfBuffer()], { type: 'application/pdf' }), 'phase3_test.pdf')
    form.append('title', 'Phase 3 Reader Test Book')

    const impRes = await fetch(`${baseUrl}/api/v1/books/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: form,
    })
    assert.strictEqual(impRes.status, 201)
    bookId = (await impRes.json()).book.id
  })

  let firstTocId

  await t.test('GET /api/v1/books/:bookId/reader returns book, HTML chunks, auto TOC, and preferences', async () => {
    const res = await fetch(`${baseUrl}/api/v1/books/${bookId}/reader`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.status, 200)
    const data = await res.json()
    assert.strictEqual(data.book.id, bookId)
    assert.ok(data.contents.length >= 1)
    assert.ok(data.toc.length >= 1)
    assert.strictEqual(data.toc[0].sourceType, 'AUTO')
    assert.strictEqual(data.preferences.theme, 'light')
    firstTocId = data.toc[0].id

    // Cross-user access denied
    const forbidden = await fetch(`${baseUrl}/api/v1/books/${bookId}/reader`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    })
    assert.strictEqual(forbidden.status, 403)
  })

  let manualTocId

  await t.test('TOC CRUD: create manual entry, reject invalid sequence, update, reorder, delete, reset', async () => {
    // Reject invalid contentSequence
    const badRes = await fetch(`${baseUrl}/api/v1/books/${bookId}/toc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ title: 'Bad Chapter', contentSequence: 999, level: 1 }),
    })
    assert.strictEqual(badRes.status, 400)

    // Create valid manual subsection under firstTocId
    const createRes = await fetch(`${baseUrl}/api/v1/books/${bookId}/toc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        title: 'Custom Subsection',
        parentId: firstTocId,
        contentSequence: 1,
        level: 2,
      }),
    })
    assert.strictEqual(createRes.status, 201)
    const created = await createRes.json()
    manualTocId = created.entry.id
    assert.strictEqual(created.entry.sourceType, 'MANUAL')
    assert.strictEqual(created.entry.parentId, firstTocId)

    // Update manual entry
    const patchRes = await fetch(`${baseUrl}/api/v1/books/${bookId}/toc/${manualTocId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ title: 'Edited Subsection Title' }),
    })
    assert.strictEqual(patchRes.status, 200)
    assert.strictEqual((await patchRes.json()).entry.title, 'Edited Subsection Title')

    // Reorder
    const reorderRes = await fetch(`${baseUrl}/api/v1/books/${bookId}/toc/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        items: [
          { id: manualTocId, parentId: null, position: 0, level: 1 },
          { id: firstTocId, parentId: null, position: 1, level: 1 },
        ],
      }),
    })
    assert.strictEqual(reorderRes.status, 200)
    const reordered = await reorderRes.json()
    assert.strictEqual(reordered.entries[0].id, manualTocId)

    // Delete manual entry
    const delRes = await fetch(`${baseUrl}/api/v1/books/${bookId}/toc/${manualTocId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(delRes.status, 200)

    // Reset to AUTO TOC
    const resetRes = await fetch(`${baseUrl}/api/v1/books/${bookId}/toc/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(resetRes.status, 200)
    const resetData = await resetRes.json()
    assert.ok(resetData.entries.every((e) => e.sourceType === 'AUTO'))
    firstTocId = resetData.entries[0].id
  })

  await t.test('Progress & Conflict Resolution: upsert, increment revision, reject stale revision, sync-state', async () => {
    const put1 = await fetch(`${baseUrl}/api/v1/books/${bookId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        currentTocEntryId: firstTocId,
        currentBlockId: 'block-s1-0',
        currentSequence: 1,
        scrollPercentage: 42.5,
        readingPercentage: 42.5,
        deviceId: 'device-pc',
      }),
    })
    assert.strictEqual(put1.status, 200)
    const p1 = await put1.json()
    assert.strictEqual(p1.conflict, false)
    assert.strictEqual(p1.progress.revision, 1)

    // Second update from mobile with clientRevision: 1 -> succeeds, revision becomes 2
    const put2 = await fetch(`${baseUrl}/api/v1/books/${bookId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        currentBlockId: 'block-s1-2',
        currentSequence: 1,
        scrollPercentage: 75,
        readingPercentage: 75,
        deviceId: 'device-mobile',
        clientRevision: 1,
      }),
    })
    assert.strictEqual(put2.status, 200)
    const p2 = await put2.json()
    assert.strictEqual(p2.conflict, false)
    assert.strictEqual(p2.progress.revision, 2)

    // Stale update from PC with clientRevision: 1 -> conflict: true, preserves 75%
    const stalePut = await fetch(`${baseUrl}/api/v1/books/${bookId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        currentBlockId: 'block-s1-0',
        currentSequence: 1,
        scrollPercentage: 10,
        readingPercentage: 10,
        deviceId: 'device-pc',
        clientRevision: 1,
      }),
    })
    assert.strictEqual(stalePut.status, 200)
    const staleData = await stalePut.json()
    assert.strictEqual(staleData.conflict, true)
    assert.strictEqual(staleData.progress.readingPercentage, 75)

    // Sync state endpoint
    const syncRes = await fetch(`${baseUrl}/api/v1/books/${bookId}/sync-state`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(syncRes.status, 200)
    const syncData = await syncRes.json()
    assert.strictEqual(syncData.progress.revision, 2)
  })

  await t.test('Reading Preferences & Sync Token endpoints work and do not leak secrets', async () => {
    const putPref = await fetch(`${baseUrl}/api/v1/users/me/reading-preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        fontSize: 20,
        fontFamily: 'sans',
        lineHeight: 1.9,
        contentWidth: 680,
        theme: 'sepia',
      }),
    })
    assert.strictEqual(putPref.status, 200)
    const prefData = await putPref.json()
    assert.strictEqual(prefData.preferences.theme, 'sepia')
    assert.strictEqual(prefData.preferences.fontSize, 20)

    const tokenRes = await fetch(`${baseUrl}/api/v1/sync/token`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(tokenRes.status, 200)
    const tokenData = await tokenRes.json()
    assert.ok(['ably', 'polling'].includes(tokenData.provider))
  })
})
