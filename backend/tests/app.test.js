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
})
