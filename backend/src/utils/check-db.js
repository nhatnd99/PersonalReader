/**
 * Script to verify Neon PostgreSQL connectivity.
 */
import prisma from '../config/database.js'

async function checkNeon() {
  try {
    console.log('Connecting to Neon PostgreSQL...')
    const result = await prisma.$queryRaw`SELECT version(), current_database(), now() as current_time`
    console.log('Neon Database Connection Verified Successfully! Result:')
    console.log(result)
    process.exit(0)
  } catch (err) {
    console.error('Failed to connect to Neon:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

checkNeon()
