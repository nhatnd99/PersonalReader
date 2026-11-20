/**
 * Prisma client singleton.
 * Reuses the connection across serverless invocations where the runtime is warm.
 * Uses connection pooling via Neon PgBouncer (DATABASE_URL).
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
