import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import app from '../src/app.js'
import prisma from '../src/config/database.js'
import { setTranslationProvider } from '../src/services/translation/translationProvider.js'

function buildSamplePdfBuffer() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [4 0 R] /Count 1 >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>',
  ]
  const stream =
    'BT /F1 20 Tf 72 720 Td (Chapter 1: Finance) Tj /F1 12 Tf 0 -30 Td (He was put in charge of the company financial operations.) Tj ET'
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

test('Phase 4: Highlights, Bookmarks, Notes & Contextual Vocabulary Suite', async (t) => {
  let server
  let baseUrl
  let userToken
  let otherToken
  let bookId
  let secondBookId

  const userEmail = `p4_user_${Date.now()}@readflow.dev`
  const otherEmail = `p4_other_${Date.now()}@readflow.dev`

  await new Promise((resolve) => {
    server = http.createServer(app)
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`
      resolve()
    })
  })

  t.after(async () => {
    setTranslationProvider(null)
    server.close()
    try {
      await prisma.user.deleteMany({ where: { email: { in: [userEmail, otherEmail] } } })
    } catch (_) {}
  })

  await t.test('Setup: Register users and import two books', async () => {
    for (const [email, displayName] of [
      [userEmail, 'Phase4 Reader'],
      [otherEmail, 'Phase4 Other'],
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

    for (const title of ['Book One', 'Book Two']) {
      const form = new FormData()
      form.append('file', new Blob([buildSamplePdfBuffer()], { type: 'application/pdf' }), `${title}.pdf`)
      form.append('title', title)
      const res = await fetch(`${baseUrl}/api/v1/books/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
        body: form,
      })
      assert.strictEqual(res.status, 201)
      const data = await res.json()
      if (!bookId) bookId = data.book.id
      else secondBookId = data.book.id
    }
  })

  await t.test('Highlights CRUD + ownership + annotationsVersion sync', async () => {
    const createRes = await fetch(`${baseUrl}/api/v1/books/${bookId}/highlights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        selectedText: 'in charge of',
        color: 'yellow',
        anchorData: {
          contentSequence: 1,
          startBlockId: 'block-s1-1',
          endBlockId: 'block-s1-1',
          startOffset: 11,
          endOffset: 23,
          selectedText: 'in charge of',
          prefixContext: 'He was put ',
          suffixContext: ' the company',
        },
      }),
    })
    assert.strictEqual(createRes.status, 201)
    const { highlight, annotationsVersion } = await createRes.json()
    assert.strictEqual(highlight.color, 'yellow')
    assert.ok(annotationsVersion >= 2)

    // Cross-user update rejected
    const forbidden = await fetch(`${baseUrl}/api/v1/highlights/${highlight.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${otherToken}` },
      body: JSON.stringify({ color: 'blue' }),
    })
    assert.strictEqual(forbidden.status, 403)

    // Owner update color
    const patchRes = await fetch(`${baseUrl}/api/v1/highlights/${highlight.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ color: 'purple' }),
    })
    assert.strictEqual(patchRes.status, 200)
    assert.strictEqual((await patchRes.json()).highlight.color, 'purple')

    // List
    const listRes = await fetch(`${baseUrl}/api/v1/books/${bookId}/highlights`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual((await listRes.json()).highlights.length, 1)

    // Delete
    const delRes = await fetch(`${baseUrl}/api/v1/highlights/${highlight.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(delRes.status, 200)
  })

  await t.test('Bookmarks CRUD + ownership', async () => {
    const createRes = await fetch(`${baseUrl}/api/v1/books/${bookId}/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        title: 'Key Finance Quote',
        chapterTitle: 'Chapter 1: Finance',
        selectedText: 'financial operations',
        description: 'Review later',
        anchorData: { contentSequence: 1, startBlockId: 'block-s1-1', startOffset: 0, endOffset: 10 },
      }),
    })
    assert.strictEqual(createRes.status, 201)
    const { bookmark } = await createRes.json()

    const patchRes = await fetch(`${baseUrl}/api/v1/bookmarks/${bookmark.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ title: 'Updated Bookmark Title' }),
    })
    assert.strictEqual(patchRes.status, 200)
    assert.strictEqual((await patchRes.json()).bookmark.title, 'Updated Bookmark Title')

    const forbidden = await fetch(`${baseUrl}/api/v1/bookmarks/${bookmark.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${otherToken}` },
    })
    assert.strictEqual(forbidden.status, 403)

    const delRes = await fetch(`${baseUrl}/api/v1/bookmarks/${bookmark.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(delRes.status, 200)
  })

  await t.test('Reading Notes CRUD + search + ownership', async () => {
    const createRes = await fetch(`${baseUrl}/api/v1/books/${bookId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        title: 'Responsibility idiom',
        content: '"In charge of" means responsible for managing something.',
        chapterTitle: 'Chapter 1: Finance',
        selectedText: 'in charge of',
        anchorData: { contentSequence: 1, startBlockId: 'block-s1-1', startOffset: 11, endOffset: 23 },
      }),
    })
    assert.strictEqual(createRes.status, 201)
    const { note } = await createRes.json()

    const searchRes = await fetch(`${baseUrl}/api/v1/books/${bookId}/notes?search=idiom`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual((await searchRes.json()).notes.length, 1)

    const patchRes = await fetch(`${baseUrl}/api/v1/notes/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ content: 'Updated note content.' }),
    })
    assert.strictEqual(patchRes.status, 200)

    const delRes = await fetch(`${baseUrl}/api/v1/notes/${note.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(delRes.status, 200)
  })

  await t.test('Vocabulary Lookup handles unconfigured provider (503) and contextual lookup (200)', async () => {
    // 1. Unconfigured provider returns 503 without fabricating results
    const prevKey = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY
    setTranslationProvider(null)

    const unconfRes = await fetch(`${baseUrl}/api/v1/vocabulary/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        word: 'charge',
        sentence: "He was put in charge of the company's financial operations.",
      }),
    })
    assert.strictEqual(unconfRes.status, 503)
    const unconfData = await unconfRes.json()
    assert.strictEqual(unconfData.code, 'TRANSLATION_PROVIDER_UNCONFIGURED')

    if (prevKey) process.env.GEMINI_API_KEY = prevKey

    // 2. Mocked contextual provider
    setTranslationProvider({
      async lookup({ word, sentence }) {
        return {
          word,
          partOfSpeech: 'noun / idiom',
          vietnameseMeaning: 'Chịu trách nhiệm quản lý / phụ trách',
          contextualMeaning: 'Trong ngữ cảnh này, "in charge of" mang nghĩa phụ trách điều hành tài chính.',
          generalMeaning: 'Sạc pin, tính phí, buộc tội',
          pronunciation: '/tʃɑːrdʒ/',
          exampleSentence: sentence,
          provider: 'mock-gemini',
        }
      },
    })

    const okRes = await fetch(`${baseUrl}/api/v1/vocabulary/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        word: 'charge',
        sentence: "He was put in charge of the company's financial operations.",
        chapterTitle: 'Chapter 1: Finance',
      }),
    })
    assert.strictEqual(okRes.status, 200)
    const { lookup } = await okRes.json()
    assert.strictEqual(lookup.vietnameseMeaning, 'Chịu trách nhiệm quản lý / phụ trách')
  })

  await t.test('Vocabulary Collection CRUD, duplicate prevention per book, cross-book allowance', async () => {
    const save1 = await fetch(`${baseUrl}/api/v1/vocabulary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        bookId,
        chapterTitle: 'Chapter 1: Finance',
        word: 'charge',
        partOfSpeech: 'noun',
        meaning: 'Chịu trách nhiệm / phụ trách',
        contextualMeaning: 'Phụ trách bộ phận tài chính',
        exampleSentence: "He was put in charge of the company's financial operations.",
        anchorData: { contentSequence: 1, startBlockId: 'block-s1-1', startOffset: 14, endOffset: 20 },
      }),
    })
    assert.strictEqual(save1.status, 201)
    const { entry } = await save1.json()

    // Duplicate in same book rejected (409)
    const dupRes = await fetch(`${baseUrl}/api/v1/vocabulary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        bookId,
        word: 'Charge',
        meaning: 'Duplicate meaning',
      }),
    })
    assert.strictEqual(dupRes.status, 409)

    // Same word in different book allowed (201)
    const save2 = await fetch(`${baseUrl}/api/v1/vocabulary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        bookId: secondBookId,
        word: 'charge',
        meaning: 'Sạc điện',
      }),
    })
    assert.strictEqual(save2.status, 201)

    // Filter by bookId
    const listRes = await fetch(`${baseUrl}/api/v1/vocabulary?bookId=${bookId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual((await listRes.json()).entries.length, 1)

    // Update personal note
    const patchRes = await fetch(`${baseUrl}/api/v1/vocabulary/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ personalNote: 'Common business collocation' }),
    })
    assert.strictEqual(patchRes.status, 200)
    assert.strictEqual((await patchRes.json()).entry.personalNote, 'Common business collocation')

    // Cross-user access denied
    const forbidden = await fetch(`${baseUrl}/api/v1/vocabulary/${entry.id}`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    })
    assert.strictEqual(forbidden.status, 403)

    // Delete
    const delRes = await fetch(`${baseUrl}/api/v1/vocabulary/${entry.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(delRes.status, 200)
  })
})
