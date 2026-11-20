# Neon PostgreSQL Setup Guide

## 1. Create a Neon Project

1. Sign up at https://neon.tech
2. Create a new project named `readflow`
3. Select the region closest to your Vercel deployment region

## 2. Get Connection Strings

In the Neon dashboard:
- Go to **Connection Details**
- Select **Prisma** as the connection type
- Copy the **pooled connection string** → `DATABASE_URL`
- Copy the **direct connection string** → `DIRECT_URL`

The pooled URL uses PgBouncer (port 6432) and is required for Prisma at runtime.
The direct URL bypasses PgBouncer and is required for `prisma migrate`.

## 3. Configure Backend

Add both URLs to `backend/.env.local` and to Vercel environment variables.

## 4. Run Migrations

```bash
cd backend
npm run db:generate   # Generate Prisma client
npm run db:migrate    # Apply migrations (dev)
# or for production:
npm run db:migrate:deploy
```

## 5. Free Tier Notes

- Storage limit: 512 MB. Monitor usage in Neon dashboard.
- Compute auto-suspends after 5 minutes of inactivity (free tier).
- Cold start latency: ~500ms after suspension. The health endpoint warms the connection.
- Use `pgbouncer=true` and `connect_timeout=15` in DATABASE_URL for resilience.
