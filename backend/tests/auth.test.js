import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import jwt from 'jsonwebtoken'
import app from '../src/app.js'
import prisma from '../src/config/database.js'

test('Backend Authentication System Test Suite', async (t) => {
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

  // Clean test user data before and after test
  const testEmail = `test_${Date.now()}@readflow.dev`
  const testPassword = 'Password123'
  const testDisplayName = 'Test User'

  let accessToken = null
  let refreshToken = null
  let userId = null

  t.after(async () => {
    try {
      if (userId) {
        await prisma.user.deleteMany({ where: { email: testEmail } })
      }
    } catch {}
    server.close()
  })

  // 1. Successful registration
  await t.test('1. Successful registration returns 201 and safe user', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        displayName: testDisplayName,
      }),
    })

    assert.strictEqual(res.status, 201)
    const body = await res.json()
    assert.strictEqual(body.message, 'Account created successfully')
    assert.ok(body.user)
    assert.strictEqual(body.user.email, testEmail.toLowerCase())
    assert.strictEqual(body.user.displayName, testDisplayName)
    assert.strictEqual(body.user.passwordHash, undefined, 'passwordHash must never be exposed')
    userId = body.user.id
  })

  // 2. Invalid email registration
  await t.test('2. Invalid email is rejected with 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
        password: testPassword,
        displayName: 'Bad Email',
      }),
    })

    assert.strictEqual(res.status, 400)
    const body = await res.json()
    assert.strictEqual(body.error, 'Validation failed')
  })

  // 3. Weak password registration
  await t.test('3. Weak password is rejected with 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `weak_${Date.now()}@readflow.dev`,
        password: 'weak', // no uppercase, no number, < 8 chars
        displayName: 'Weak Password',
      }),
    })

    assert.strictEqual(res.status, 400)
    const body = await res.json()
    assert.strictEqual(body.error, 'Validation failed')
  })

  // 4. Duplicate email registration
  await t.test('4. Duplicate email registration returns 409', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail, // same email
        password: testPassword,
        displayName: 'Duplicate User',
      }),
    })

    assert.strictEqual(res.status, 409)
    const body = await res.json()
    assert.strictEqual(body.error, 'An account with this email already exists')
  })

  // 5. Successful login
  await t.test('5. Successful login returns 200 with tokens and safe user', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    })

    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.ok(body.accessToken)
    assert.ok(body.refreshToken)
    assert.strictEqual(body.user.email, testEmail.toLowerCase())
    assert.strictEqual(body.user.passwordHash, undefined)

    // Save tokens for subsequent tests
    accessToken = body.accessToken
    refreshToken = body.refreshToken
  })

  // 6. Invalid credentials login
  await t.test('6. Invalid credentials return 401 generic error', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword999',
      }),
    })

    assert.strictEqual(res.status, 401)
    const body = await res.json()
    assert.strictEqual(body.error, 'Invalid email or password')
  })

  // 7. Accessing protected endpoint without authentication
  await t.test('7. Accessing /api/v1/auth/me without auth header returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`)
    assert.strictEqual(res.status, 401)
    const body = await res.json()
    assert.ok(body.error)
  })

  // 8. Expired access token
  await t.test('8. Expired access token is rejected with 401 and code TOKEN_EXPIRED', async () => {
    const secret = process.env.JWT_SECRET || 'rf_default_dev_secret_32_chars_min!'
    const expiredToken = jwt.sign(
      { sub: userId, type: 'access' },
      secret,
      { expiresIn: '-1s' }
    )

    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    })

    assert.strictEqual(res.status, 401)
    const body = await res.json()
    assert.strictEqual(body.code, 'TOKEN_EXPIRED')
  })

  // 9. Invalid refresh token
  await t.test('9. Invalid refresh token returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'invalid-non-existent-token-12345' }),
    })

    assert.strictEqual(res.status, 401)
  })

  // 10. Refresh token rotation
  await t.test('10. Refresh token rotation issues new access token & new refresh token', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.ok(body.accessToken)
    assert.ok(body.refreshToken)
    assert.notStrictEqual(body.refreshToken, refreshToken, 'Refresh token must be rotated')

    // Old refresh token must be rejected if reused!
    const reuseRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    assert.strictEqual(reuseRes.status, 401, 'Reused refresh token must be rejected')

    // Update current tokens
    accessToken = body.accessToken
    refreshToken = body.refreshToken
  })

  // 11. Get current user
  await t.test('11. GET /api/v1/auth/me with valid token returns user without passwordHash', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.ok(body.user)
    assert.strictEqual(body.user.id, userId)
    assert.strictEqual(body.user.email, testEmail.toLowerCase())
    assert.strictEqual(body.user.displayName, testDisplayName)
    assert.strictEqual(body.user.passwordHash, undefined)
  })

  // 12. Logout and revoked refresh token
  await t.test('12. Logout revokes refresh token and clears session', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    assert.strictEqual(res.status, 200)

    // Using the revoked refresh token must now fail
    const refreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    assert.strictEqual(refreshRes.status, 401)
  })

  // 13. Ensure passwordHash is never returned anywhere in API responses
  await t.test('13. passwordHash is never exposed in any auth response', async () => {
    const dbUser = await prisma.user.findUnique({ where: { id: userId } })
    assert.ok(dbUser.passwordHash, 'Database has passwordHash')

    // Check login response
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    })
    const loginBody = await loginRes.json()
    assert.strictEqual(JSON.stringify(loginBody).includes(dbUser.passwordHash), false)
  })
})
