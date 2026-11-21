import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import app from '../src/app.js'

test('Backend Express App Integration & Smoke Test', async (t) => {
  let server
  let baseUrl

  // Setup ephemeral server
  await new Promise((resolve) => {
    server = http.createServer(app)
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })

  t.after(() => {
    server.close()
  })

  await t.test('App exports Express instance', () => {
    assert.strictEqual(typeof app, 'function')
    assert.strictEqual(typeof app.use, 'function')
    assert.strictEqual(typeof app.listen, 'function')
  })

  await t.test('GET unknown endpoint returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/v1/unknown-test-route`)
    assert.strictEqual(res.status, 404)
    const data = await res.json()
    assert.deepStrictEqual(data, { error: 'Route not found' })
  })

  await t.test('GET /api/v1/health responds with JSON status', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`)
    assert.strictEqual(res.status, 200)
    const data = await res.json()
    assert.strictEqual(data.status, 'ok')
    assert.strictEqual(data.version, '0.0.1')
    assert.ok(data.timestamp)
    assert.ok(data.db)
  })

  await t.test('CORS allows requests with no origin (direct browser/curl)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`)
    assert.strictEqual(res.status, 200)
  })

  await t.test('CORS rejects unauthorized origin with 403', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { Origin: 'https://malicious-site.example.com' },
    })
    assert.strictEqual(res.status, 403)
  })

  await t.test('CORS allows Vercel preview domain and returns CORP cross-origin', async () => {
    const vercelOrigin = 'https://personal-reader-ql2qcfb64-nhatnd0909s-projects.vercel.app'
    const res = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { Origin: vercelOrigin },
    })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.headers.get('access-control-allow-origin'), vercelOrigin)
    assert.strictEqual(res.headers.get('cross-origin-resource-policy'), 'cross-origin')
  })

  await t.test('CORS preflight OPTIONS on /api/v1/auth/register succeeds', async () => {
    const vercelOrigin = 'https://personal-reader-ql2qcfb64-nhatnd0909s-projects.vercel.app'
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'OPTIONS',
      headers: {
        Origin: vercelOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    })
    assert.strictEqual(res.status, 204)
    assert.strictEqual(res.headers.get('access-control-allow-origin'), vercelOrigin)
    assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true')
  })
})
