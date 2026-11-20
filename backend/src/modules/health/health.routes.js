import { Router } from 'express'
import prisma from '../../config/database.js'

const router = Router()

router.get('/', async (_req, res) => {
  let dbStatus = 'unknown'
  try {
    await prisma.$queryRaw`SELECT 1`
    dbStatus = 'ok'
  } catch (e) {
    dbStatus = 'error: ' + e.message
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.0.1',
    db: dbStatus,
  })
})

export default router
