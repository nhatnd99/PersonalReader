# ReadFlow Environment Variables Reference

Never commit `.env.local` or secret keys to version control. Never prefix backend secrets with `VITE_`.

## Backend (`backend/.env.local` & Vercel `readflow-api`)

| Variable | Required | Example / Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://...-pooler.../neondb?sslmode=require&connect_timeout=15` | Neon pooled connection for Prisma runtime |
| `DIRECT_URL` | Yes | `postgresql://.../neondb?sslmode=require&connect_timeout=15` | Neon direct connection for Prisma migrations |
| `JWT_SECRET` | Yes | *(min 32 random chars)* | Signing key for JWT access tokens |
| `JWT_EXPIRES_IN` | No | `15m` | Access token TTL |
| `FRONTEND_ORIGINS` | Yes | `https://your-frontend.vercel.app` | Comma-separated allowed CORS origins |
| `NODE_ENV` | Yes | `production` | Controls secure cookie flags and error formatting |
| `R2_ACCOUNT_ID` | Yes | `<cloudflare-account-id>` | Cloudflare account identifier |
| `R2_ACCESS_KEY_ID` | Yes | `<r2-access-key-id>` | Cloudflare R2 S3 API access key |
| `R2_SECRET_ACCESS_KEY` | Yes | `<r2-secret-access-key>` | Cloudflare R2 S3 API secret key |
| `R2_BUCKET_NAME` | Yes | `readflow-pdfs` | Private R2 bucket name |
| `R2_ENDPOINT` | No | `https://<account-id>.r2.cloudflarestorage.com` | S3-compatible R2 endpoint (auto-derived from `R2_ACCOUNT_ID` if omitted) |
| `R2_REGION` | No | `auto` | R2 region |
| `R2_PRESIGNED_URL_EXPIRES_IN` | No | `900` | Pre-signed PUT URL expiry in seconds |
| `MAX_PDF_SIZE_BYTES` | No | `52428800` | Max upload size per PDF (50 MB) |
| `MAX_USER_STORAGE_BYTES` | No | `524288000` | Max total storage per user (500 MB) |

## Frontend (`frontend/.env.local` & Vercel `readflow`)

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes | `https://readflow-api.vercel.app` | Backend API base URL (no trailing slash) |
| `VITE_APP_NAME` | No | `ReadFlow` | Display name |
