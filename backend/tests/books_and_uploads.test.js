import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { S3Client } from '@aws-sdk/client-s3'
import app from '../src/app.js'
import prisma from '../src/config/database.js'
import { setS3Client } from '../src/services/storage/r2.service.js'

test('Phase 2: Book Library & Cloudflare R2 Upload Test Suite', async (t) => {
  let server
  let baseUrl
  let userToken
  let userId
  let otherUserToken
  let otherUserId

  const testEmail = `p2_user_${Date.now()}@readflow.dev`
  const otherEmail = `p2_other_${Date.now()}@readflow.dev`

  // Mock R2 state controller
  const mockR2State = {
    shouldFailHead: false,
    contentLength: 50000,
    isInvalidPdf: false,
  }

  // Inject Mock S3 client with real S3Client config for getSignedUrl
  const mockS3Client = new S3Client({
    region: 'auto',
    endpoint: 'https://mock.r2.cloudflarestorage.com',
    credentials: {
      accessKeyId: 'mock-access-key',
      secretAccessKey: 'mock-secret-key-32-chars-long-test!',
    },
  })

  mockS3Client.send = async (command) => {
    const cmdName = command.constructor?.name || ''
    if (cmdName === 'HeadObjectCommand') {
      if (mockR2State.shouldFailHead) {
        const err = new Error('NotFound')
        err.name = 'NotFound'
        err.$metadata = { httpStatusCode: 404 }
        throw err
      }
      return {
        ContentLength: mockR2State.contentLength,
        ContentType: 'application/pdf',
        ETag: '"mock-etag-abcdef"',
      }
    }

    if (cmdName === 'GetObjectCommand') {
      const chunk = mockR2State.isInvalidPdf
        ? Buffer.from('INVALID-HEADER')
        : Buffer.from('%PDF-1.7\n')
      return {
        Body: (async function* () {
          yield chunk
        })(),
      }
    }

    if (cmdName === 'DeleteObjectCommand') {
      return {}
    }

    return {}
  }

  setS3Client(mockS3Client)

  // Start ephemeral HTTP server
  await new Promise((resolve) => {
    server = http.createServer(app)
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })

  // Cleanup after tests
  t.after(async () => {
    server.close()
    try {
      await prisma.user.deleteMany({
        where: { email: { in: [testEmail, otherEmail] } },
      })
    } catch (_) {}
  })

  // 1. Setup authenticated users
  await t.test('Setup: Register test users and acquire JWT tokens', async () => {
    // Register primary user
    const res1 = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123',
        displayName: 'Bookworm User',
      }),
    })
    assert.strictEqual(res1.status, 201)
    const data1 = await res1.json()
    userId = data1.user.id

    const loginRes1 = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'Password123' }),
    })
    const loginData1 = await loginRes1.json()
    userToken = loginData1.accessToken

    // Register secondary user for cross-user tests
    const res2 = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: otherEmail,
        password: 'Password123',
        displayName: 'Other User',
      }),
    })
    assert.strictEqual(res2.status, 201)
    const data2 = await res2.json()
    otherUserId = data2.user.id

    const loginRes2 = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otherEmail, password: 'Password123' }),
    })
    const loginData2 = await loginRes2.json()
    otherUserToken = loginData2.accessToken

    assert.ok(userToken)
    assert.ok(otherUserToken)
  })

  let activeUploadId
  let activeBookId
  let activeObjectKey

  // 2. Upload Initiation Tests
  await t.test('Upload: Unauthenticated initiate is rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/uploads/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'test.pdf',
        fileSize: 10240,
        mimeType: 'application/pdf',
        title: 'Test Book',
      }),
    })
    assert.strictEqual(res.status, 401)
  })

  await t.test('Upload: Non-PDF file extension is rejected with 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/uploads/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        fileName: 'malicious.exe',
        fileSize: 10240,
        mimeType: 'application/pdf',
        title: 'Executable',
      }),
    })
    assert.strictEqual(res.status, 400)
    const data = await res.json()
    assert.strictEqual(data.error, 'Validation failed')
  })

  await t.test('Upload: File exceeding maximum size is rejected with 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/uploads/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        fileName: 'huge.pdf',
        fileSize: 100 * 1024 * 1024, // 100MB > 50MB
        mimeType: 'application/pdf',
        title: 'Huge Book',
      }),
    })
    assert.strictEqual(res.status, 400)
  })

  await t.test('Upload: Valid initiate creates Book, UploadSession and returns presigned URL', async () => {
    const res = await fetch(`${baseUrl}/api/v1/uploads/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        fileName: 'pride_and_prejudice.pdf',
        fileSize: 50000,
        mimeType: 'application/pdf',
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        description: 'Classic romantic novel',
      }),
    })

    assert.strictEqual(res.status, 201)
    const data = await res.json()
    assert.ok(data.uploadId)
    assert.ok(data.bookId)
    assert.ok(data.uploadUrl)
    assert.ok(data.objectKey)
    assert.strictEqual(data.book.status, 'pending')
    assert.strictEqual(data.book.title, 'Pride and Prejudice')
    assert.ok(data.objectKey.startsWith(`users/${userId}/books/${data.bookId}/`))

    activeUploadId = data.uploadId
    activeBookId = data.bookId
    activeObjectKey = data.objectKey
  })

  // 3. Upload Session Inspection & Refresh
  await t.test('Upload: Get upload session status', async () => {
    const res = await fetch(`${baseUrl}/api/v1/uploads/${activeUploadId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.status, 200)
    const data = await res.json()
    assert.strictEqual(data.session.id, activeUploadId)
    assert.strictEqual(data.session.status, 'pending')
  })

  await t.test('Upload: Cross-user access to upload session is forbidden with 403', async () => {
    const res = await fetch(`${baseUrl}/api/v1/uploads/${activeUploadId}`, {
      headers: { Authorization: `Bearer ${otherUserToken}` },
    })
    assert.strictEqual(res.status, 403)
  })

  await t.test('Upload: Refresh pre-signed URL generates new URL', async () => {
    const res = await fetch(`${baseUrl}/api/v1/uploads/${activeUploadId}/refresh-url`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.status, 200)
    const data = await res.json()
    assert.ok(data.uploadUrl)
    assert.strictEqual(data.uploadId, activeUploadId)
  })

  // 4. Upload Completion Tests
  await t.test('Upload: Complete fails if object does not exist in R2', async () => {
    mockR2State.shouldFailHead = true

    const res = await fetch(`${baseUrl}/api/v1/uploads/${activeUploadId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.status, 400)
    const data = await res.json()
    assert.ok(data.error.includes('not found in storage'))

    mockR2State.shouldFailHead = false
  })

  await t.test('Upload: Complete fails if file has invalid PDF signature', async () => {
    mockR2State.isInvalidPdf = true

    const res = await fetch(`${baseUrl}/api/v1/uploads/${activeUploadId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.status, 400)
    const data = await res.json()
    assert.ok(data.error.includes('valid PDF signature'))

    mockR2State.isInvalidPdf = false
  })

  await t.test('Upload: Complete succeeds when R2 verification passes', async () => {
    // Reset session back to pending for retry
    await prisma.uploadSession.update({
      where: { id: activeUploadId },
      data: { status: 'pending' },
    })

    const res = await fetch(`${baseUrl}/api/v1/uploads/${activeUploadId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.status, 200)
    const data = await res.json()
    assert.strictEqual(data.message, 'Upload completed successfully')
    assert.strictEqual(data.book.status, 'ready')
    assert.strictEqual(data.book.files.length, 1)
    assert.strictEqual(data.book.files[0].objectKey, activeObjectKey)
  })

  await t.test('Upload: Repeated complete call is idempotent and returns existing book', async () => {
    const res = await fetch(`${baseUrl}/api/v1/uploads/${activeUploadId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.status, 200)
    const data = await res.json()
    assert.strictEqual(data.message, 'Upload already completed')
    assert.strictEqual(data.book.id, activeBookId)
  })

  // 5. Book Management Tests
  await t.test('Books: GET /api/v1/books lists user books with pagination', async () => {
    const res = await fetch(`${baseUrl}/api/v1/books`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.status, 200)
    const data = await res.json()
    assert.strictEqual(data.books.length, 1)
    assert.strictEqual(data.books[0].id, activeBookId)
    assert.strictEqual(data.pagination.total, 1)
  })

  await t.test('Books: GET /api/v1/books with search query filters results', async () => {
    // Matching search
    const resMatch = await fetch(`${baseUrl}/api/v1/books?search=Austen`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    const dataMatch = await resMatch.json()
    assert.strictEqual(dataMatch.books.length, 1)

    // Non-matching search
    const resNoMatch = await fetch(`${baseUrl}/api/v1/books?search=NonExistent`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    const dataNoMatch = await resNoMatch.json()
    assert.strictEqual(dataNoMatch.books.length, 0)
  })

  await t.test('Books: Other user cannot see primary user books', async () => {
    const res = await fetch(`${baseUrl}/api/v1/books`, {
      headers: { Authorization: `Bearer ${otherUserToken}` },
    })
    assert.strictEqual(res.status, 200)
    const data = await res.json()
    assert.strictEqual(data.books.length, 0)
  })

  await t.test('Books: GET /api/v1/books/:bookId returns book details', async () => {
    const res = await fetch(`${baseUrl}/api/v1/books/${activeBookId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.status, 200)
    const data = await res.json()
    assert.strictEqual(data.book.title, 'Pride and Prejudice')
    assert.strictEqual(data.book.files.length, 1)
  })

  await t.test('Books: Cross-user access to book returns 403', async () => {
    const res = await fetch(`${baseUrl}/api/v1/books/${activeBookId}`, {
      headers: { Authorization: `Bearer ${otherUserToken}` },
    })
    assert.strictEqual(res.status, 403)
  })

  await t.test('Books: PATCH /api/v1/books/:bookId updates metadata including language', async () => {
    const res = await fetch(`${baseUrl}/api/v1/books/${activeBookId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        title: 'Pride and Prejudice (Annotated Edition)',
        author: 'Jane Austen & Editors',
        language: 'English',
      }),
    })
    assert.strictEqual(res.status, 200)
    const data = await res.json()
    assert.strictEqual(data.book.title, 'Pride and Prejudice (Annotated Edition)')
    assert.strictEqual(data.book.author, 'Jane Austen & Editors')
    assert.strictEqual(data.book.language, 'English')
  })

  await t.test('Books: GET /api/v1/books?sort=updated returns books sorted by updatedAt', async () => {
    const res = await fetch(`${baseUrl}/api/v1/books?sort=updated`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.status, 200)
    const data = await res.json()
    assert.strictEqual(data.books.length, 1)
  })

  await t.test('Books: GET /api/v1/books/:bookId/download-url and /file-url return signed URL', async () => {
    const res = await fetch(`${baseUrl}/api/v1/books/${activeBookId}/download-url`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.status, 200)
    const data = await res.json()
    assert.ok(data.downloadUrl)
    assert.strictEqual(data.fileName, 'pride_and_prejudice.pdf')
    assert.strictEqual(data.expiresIn, 300)

    const aliasRes = await fetch(`${baseUrl}/api/v1/books/${activeBookId}/file-url`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(aliasRes.status, 200)
    const aliasData = await aliasRes.json()
    assert.ok(aliasData.downloadUrl)
  })

  await t.test('Books: DELETE /api/v1/books/:bookId soft-deletes book', async () => {
    const res = await fetch(`${baseUrl}/api/v1/books/${activeBookId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.status, 200)

    // Subsequent GET returns 404
    const getRes = await fetch(`${baseUrl}/api/v1/books/${activeBookId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(getRes.status, 404)

    // Book listing returns 0 active books
    const listRes = await fetch(`${baseUrl}/api/v1/books`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    const listData = await listRes.json()
    assert.strictEqual(listData.books.length, 0)
  })

  await t.test('Upload: Expired session is rejected on complete and cancel cleans up pending book', async () => {
    const initRes = await fetch(`${baseUrl}/api/v1/uploads/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        fileName: 'temp_expired.pdf',
        fileSize: 12000,
        mimeType: 'application/pdf',
        title: 'Temporary Expired Book',
      }),
    })
    assert.strictEqual(initRes.status, 201)
    const initData = await initRes.json()

    // Force expire in DB
    await prisma.uploadSession.update({
      where: { id: initData.uploadId },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    })

    const completeRes = await fetch(`${baseUrl}/api/v1/uploads/${initData.uploadId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(completeRes.status, 400)
    const completeErr = await completeRes.json()
    assert.ok(completeErr.error.includes('expired'))

    const cancelRes = await fetch(`${baseUrl}/api/v1/uploads/${initData.uploadId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(cancelRes.status, 200)
  })
})
