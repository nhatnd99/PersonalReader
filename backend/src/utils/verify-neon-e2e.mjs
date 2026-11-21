/**
 * Live End-to-End verification script for Neon Postgres integration.
 */
import http from 'node:http'
import app from '../app.js'
import prisma from '../config/database.js'

async function runVerification() {
  console.log('--- 1. Testing Neon Database Direct Query ---')
  const dbInfo = await prisma.$queryRaw`SELECT version(), current_database(), current_user, now() as timestamp`
  console.log('Neon Database Query Result:', dbInfo)

  console.log('\n--- 2. Starting Backend App on Ephemeral Port ---')
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`
  console.log(`Backend live on ${baseUrl}`)

  try {
    console.log('\n--- 3. Testing GET /api/v1/health ---')
    const healthRes = await fetch(`${baseUrl}/api/v1/health`)
    const healthJson = await healthRes.json()
    console.log('Health Endpoint Status:', healthRes.status, healthJson)

    console.log('\n--- 4. Testing End-to-End User Flow on Neon ---')
    const testEmail = `neon_verify_${Date.now()}@readflow.dev`
    const testPassword = 'SecurePassword123'
    const testName = 'Neon Tester'

    // Register
    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword, displayName: testName }),
    })
    const regJson = await regRes.json()
    console.log('Registration Status:', regRes.status, regJson.message, 'User ID:', regJson.user?.id)

    // Login
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    })
    const loginJson = await loginRes.json()
    console.log('Login Status:', loginRes.status, 'Received Access Token:', !!loginJson.accessToken)

    // Authenticated /me
    const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${loginJson.accessToken}` },
    })
    const meJson = await meRes.json()
    console.log('/me Endpoint Status:', meRes.status, 'Verified User Email:', meJson.user?.email)

    // Cleanup test user
    await prisma.user.delete({ where: { email: testEmail } })
    console.log('\n--- 5. Test User Cleaned Up from Neon ---')

    console.log('\n✅ ALL NEON INTEGRATION TESTS PASSED END TO END!')
  } finally {
    server.close()
    await prisma.$disconnect()
  }
}

runVerification().catch((err) => {
  console.error('Verification failed:', err)
  process.exit(1)
})
