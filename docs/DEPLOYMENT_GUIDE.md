# ReadFlow Production Deployment Guide

A step-by-step operational guide for deploying ReadFlow's frontend and backend to Vercel (Hobby Tier) with a Neon PostgreSQL (Free Tier) database.

---

## Table of Contents

1. [Architecture & Deployment Model](#1-architecture--deployment-model)
2. [Pre-Deployment Readiness & Inspection](#2-pre-deployment-readiness--inspection)
3. [Neon PostgreSQL Database Setup](#3-neon-postgresql-database-setup)
4. [Backend Deployment to Vercel (`readflow-api`)](#4-backend-deployment-to-vercel-readflow-api)
5. [Frontend Deployment to Vercel (`readflow`)](#5-frontend-deployment-to-vercel-readflow)
6. [CORS, Authentication & Cookie Configuration](#6-cors-authentication--cookie-configuration)
7. [Recommended Deployment Sequence](#7-recommended-deployment-sequence)
8. [Production Health Checks & Verification](#8-production-health-checks--verification)
9. [End-to-End Production Verification Checklist](#9-end-to-end-production-verification-checklist)
10. [Troubleshooting Guide](#10-troubleshooting-guide)
11. [Rollback, Recovery & Incident Response](#11-rollback-recovery--incident-response)
12. [Official Documentation References](#12-official-documentation-references)

---

## 1. Architecture & Deployment Model

ReadFlow uses a **monorepo with two independently deployed Vercel projects** connecting to a serverless **Neon PostgreSQL** database.

```text
┌─────────────────────────────────────────────────────────────┐
│                       Browser / PWA                         │
│             (https://readflow.vercel.app)                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
            HTTPS REST APIs    │ (withCredentials: true)
            Bearer Token &     │ (X-Refresh-Token fallback)
            HttpOnly Cookies   ▼
┌─────────────────────────────────────────────────────────────┐
│                 Vercel Node.js Serverless                   │
│           (https://readflow-api.vercel.app)                 │
│              Express App via api/index.js                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
     PostgreSQL connection     │ PgBouncer Pooler (runtime)
     via Prisma 5.22           │ Direct URL (migrations)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Neon PostgreSQL                          │
│               Project: personal-reader                      │
│                 Branch: production                          │
└─────────────────────────────────────────────────────────────┘
```

### Components Summary

| Component | Repository Path | Hosting Target | Runtime / Framework |
|---|---|---|---|
| **Frontend** | `frontend/` | Vercel (Project 1) | React 18 + Vite 5 (SPA / PWA) |
| **Backend** | `backend/` | Vercel (Project 2) | Express.js on Vercel Functions (`@vercel/node`) |
| **Database** | Neon Cloud | Neon Free Tier | PostgreSQL 18 with PgBouncer connection pooler |

---

## 2. Pre-Deployment Readiness & Inspection

Before deploying, verify that your local workspace passes all lint, test, and build checks.

### Repository Inspection Checklist

```bash
# 1. Monorepo root check
git status
# Must be clean or on your deployment branch

# 2. Verify backend test suite (against Neon)
cd backend
npm test
# Expected: 18 passing tests

# 3. Verify frontend test suite & production build
cd ../frontend
npm test
# Expected: 6 passing tests

npm run build
# Expected: Vite build succeeds and generates dist/ with service worker
```

### Monorepo Directory Reference

- **Frontend entry**: [frontend/src/main.jsx](file:///c:/Users/ADMIN/Desktop/Project/PersonalReader/frontend/src/main.jsx)
- **Frontend Vercel configuration**: [frontend/vercel.json](file:///c:/Users/ADMIN/Desktop/Project/PersonalReader/frontend/vercel.json)
- **Backend entry (Serverless)**: [backend/api/index.js](file:///c:/Users/ADMIN/Desktop/Project/PersonalReader/backend/api/index.js)
- **Backend entry (Local dev)**: [backend/src/server.js](file:///c:/Users/ADMIN/Desktop/Project/PersonalReader/backend/src/server.js)
- **Backend Vercel configuration**: [backend/vercel.json](file:///c:/Users/ADMIN/Desktop/Project/PersonalReader/backend/vercel.json)
- **Database schema**: [backend/prisma/schema.prisma](file:///c:/Users/ADMIN/Desktop/Project/PersonalReader/backend/prisma/schema.prisma)

---

## 3. Neon PostgreSQL Database Setup

ReadFlow uses Neon Lakebase Postgres. Neon separates compute from storage, allowing instant scale-to-zero during inactivity and connection pooling via PgBouncer.

### 3.1 Connection String Architecture

Prisma requires two distinct database URLs:

| Variable | Connection Type | Target Port | Used For | Example Format |
|---|---|---|---|---|
| `DATABASE_URL` | **Pooled** (PgBouncer) | `5432` / host contains `-pooler` | Web runtime queries (`PrismaClient`) | `postgresql://user:pass@ep-xyz-pooler.c-3.aws.neon.tech/neondb?sslmode=require&connect_timeout=15` |
| `DIRECT_URL` | **Unpooled** (Direct) | `5432` / host without `-pooler` | Schema migrations (`prisma migrate deploy`) | `postgresql://user:pass@ep-xyz.c-3.aws.neon.tech/neondb?sslmode=require&connect_timeout=15` |

> [!IMPORTANT]
> - Always append `&connect_timeout=15` to both strings to allow Neon compute endpoints to wake up from idle suspension without throwing timeout errors.
> - `DIRECT_URL` bypasses PgBouncer transaction-mode limits, which is required for database locks during schema migrations.

### 3.2 Obtaining Connection Strings

Using the Neon CLI or Neon Console:

```bash
# 1. Print connection strings for the production branch
neon connection-string --pooled
# -> Use this value for DATABASE_URL

neon connection-string
# -> Use this value for DIRECT_URL
```

Or via Neon Console:
1. Navigate to your project (`personal-reader` / `winter-night-03430231`).
2. Select **Dashboard** → **Connection Details**.
3. Toggle **Connection pooling** ON to copy `DATABASE_URL`.
4. Toggle **Connection pooling** OFF to copy `DIRECT_URL`.

### 3.3 Running Production Migrations Safely

> [!CAUTION]
> - **NEVER** run `prisma migrate reset` in production. It drops the database and permanently deletes all data.
> - **NEVER** use `prisma db push` as a substitute for tracked migrations in production.
> - Only use `prisma migrate deploy`, which applies pending SQL scripts from `prisma/migrations/` sequentially.

Execute migrations from your deployment pipeline or local terminal with the production environment:

```bash
cd backend
npx prisma migrate deploy
```

Verify migration status:
```bash
npx prisma migrate status
```
Expected output:
```text
Database schema is up to date!
```

---

## 4. Backend Deployment to Vercel (`readflow-api`)

The backend Express application runs as a **Vercel Serverless Function**.

### 4.1 Serverless Entry Point Verification

The backend entry point is [backend/api/index.js](file:///c:/Users/ADMIN/Desktop/Project/PersonalReader/backend/api/index.js):

```javascript
import app from '../src/app.js'
export default app
```

- `backend/src/app.js` exports the configured Express app instance.
- `app.listen()` is **only** called in `backend/src/server.js` for local development. It is **never** called in serverless execution.
- [backend/vercel.json](file:///c:/Users/ADMIN/Desktop/Project/PersonalReader/backend/vercel.json) routes all incoming requests `/(.*)` to `api/index.js`.

### 4.2 Step-by-Step Vercel Setup (Backend)

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** → **Project**.
3. Import your `readflow` Git repository.
4. Name the project: `readflow-api` (or custom name).
5. Configure **Root Directory**:
   - Click **Edit** next to Root Directory.
   - Select **`backend`**.
   - Click **Continue**.
6. Configure **Build and Output Settings**:
   - **Framework Preset**: `Other`
   - **Build Command**: `prisma generate` (or leave default `npm run build`, which triggers `prisma generate`).
   - **Output Directory**: Leave empty.
   - **Install Command**: `npm install`
7. Expand **Environment Variables** and add all variables listed below.
8. Click **Deploy**.

### 4.3 Backend Environment Variables Table

| Variable Name | Required? | Example Value | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | `postgresql://...-pooler.../neondb?sslmode=require&connect_timeout=15` | Pooled connection string for Prisma runtime queries. |
| `DIRECT_URL` | **Yes** | `postgresql://...[no-pooler].../neondb?sslmode=require&connect_timeout=15` | Direct unpooled connection string for migrations. |
| `JWT_SECRET` | **Yes** | `a-cryptographically-secure-random-string-min-32-chars` | Secret key used for signing access tokens. |
| `JWT_EXPIRES_IN` | No | `15m` | Access token lifespan (default: `15m`). |
| `FRONTEND_ORIGINS` | **Yes** | `https://readflow.vercel.app` | Comma-separated list of allowed frontend origins for CORS. |
| `NODE_ENV` | **Yes** | `production` | Ensures security headers, secure cookies, and optimized logging. |
| `PORT` | No | `3001` | Used only for local dev in `server.js` (ignored by Vercel). |
| `MAX_PDF_SIZE_BYTES` | No | `52428800` | Max PDF file size (50 MB default). |
| `MAX_USER_STORAGE_BYTES` | No | `524288000` | Max storage quota per user (500 MB default). |

> [!WARNING]
> When first deploying the backend, you may not know the exact frontend domain yet. Enter a placeholder such as `https://readflow.vercel.app`. You will update this value in Step 7 once the frontend is deployed.

---

## 5. Frontend Deployment to Vercel (`readflow`)

The frontend is a React SPA built with Vite and packaged as an installable PWA.

### 5.1 SPA Routing & Vercel Rewrites

Single-page applications require Vercel to route direct page loads (e.g., `/login`, `/register`) to `index.html`. This is pre-configured in [frontend/vercel.json](file:///c:/Users/ADMIN/Desktop/Project/PersonalReader/frontend/vercel.json):

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/((?!api/.*).*)",
      "destination": "/index.html"
    }
  ]
}
```

### 5.2 Step-by-Step Vercel Setup (Frontend)

1. In the Vercel Dashboard, click **Add New...** → **Project**.
2. Select the **same** Git repository (`readflow`).
3. Name the project: `readflow` (or custom name).
4. Configure **Root Directory**:
   - Click **Edit** next to Root Directory.
   - Select **`frontend`**.
   - Click **Continue**.
5. Configure **Build and Output Settings**:
   - **Framework Preset**: `Vite` (automatically detected).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
6. Expand **Environment Variables** and add the variables listed below.
7. Click **Deploy**.

### 5.3 Frontend Environment Variables Table

| Variable Name | Required? | Example Value | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | **Yes** | `https://readflow-api.vercel.app` | Base URL of deployed backend. **Do not include a trailing slash.** |
| `VITE_APP_NAME` | No | `ReadFlow` | Application display name. |

> [!CAUTION]
> **NEVER** add `DATABASE_URL`, `JWT_SECRET`, or any backend secrets to the frontend environment variables. Any variable prefixed with `VITE_` is baked into public client-side JavaScript bundles.

---

## 6. CORS, Authentication & Cookie Configuration

Because the frontend (`readflow.vercel.app`) and backend (`readflow-api.vercel.app`) operate on different subdomains, cross-origin communication requires specific security configurations.

### 6.1 Backend CORS Setup

The CORS policy in [backend/src/config/cors.js](file:///c:/Users/ADMIN/Desktop/Project/PersonalReader/backend/src/config/cors.js) is dynamically configured:

```javascript
const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

export const corsOptions = {
  origin: (origin, callback) => {
    if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token'],
  exposedHeaders: ['Set-Cookie'],
}
```

- **`credentials: true`**: Allows the browser to send and receive authorization cookies and headers.
- **Explicit Allowlist**: Wildcard (`*`) origins are prohibited when `credentials: true`.
- **Preflight Support**: Express handles `OPTIONS` requests via `app.options('*', cors(corsOptions))` in `backend/src/app.js`.

### 6.2 Dual-Token Refresh Architecture

To ensure reliable authentication across different browsers (especially those blocking third-party cross-site cookies like Safari ITP or Brave):

1. **HttpOnly Cookie**:
   - Cookie name: `rf_refresh`
   - Attributes in production: `SameSite=None`, `Secure=true`, `HttpOnly=true`, `Path=/api/v1/auth`.
2. **Response Body & Header Fallback**:
   - On login/refresh, the backend also returns `refreshToken` in the JSON response body.
   - The frontend stores this in `localStorage` (`rf_refresh_token`).
   - If cookies are blocked, Axios sends the refresh token via the `X-Refresh-Token` header and JSON body on `/api/v1/auth/refresh`.

---

## 7. Recommended Deployment Sequence

Follow this order to prevent connection failures:

```text
Step 1: Database Migration
        Apply pending Prisma migrations to Neon (npx prisma migrate deploy)
                      │
                      ▼
Step 2: Deploy Backend Vercel Project (readflow-api)
        Configure DATABASE_URL, DIRECT_URL, JWT_SECRET, FRONTEND_ORIGINS (placeholder)
                      │
                      ▼
Step 3: Verify Backend Health
        Verify GET https://readflow-api.vercel.app/api/v1/health returns {"status":"ok","db":"ok"}
                      │
                      ▼
Step 4: Deploy Frontend Vercel Project (readflow)
        Configure VITE_API_BASE_URL=https://readflow-api.vercel.app
                      │
                      ▼
Step 5: Update Backend CORS
        Set FRONTEND_ORIGINS=https://readflow.vercel.app in backend project settings
        Redeploy backend
                      │
                      ▼
Step 6: End-to-End Verification
        Test user registration, login, token refresh, and logout
```

**Why deploy the backend first?**  
Vite bakes `VITE_API_BASE_URL` into static assets at build time. Having the real backend domain ensures the frontend bundle points to the correct API endpoint upon its first build.

---

## 8. Production Health Checks & Verification

### 8.1 Health Endpoint Verification

ReadFlow includes an operational health endpoint at `GET /api/v1/health`.

Send a GET request using `curl` or a browser:

```bash
curl -i https://<your-backend-domain>/api/v1/health
```

Expected response (`HTTP/1.1 200 OK`):
```json
{
  "status": "ok",
  "timestamp": "2026-11-21T16:06:39.322Z",
  "version": "0.0.1",
  "db": "ok"
}
```

- `db: "ok"` proves the Vercel Function successfully executed a query on Neon via PgBouncer.
- If Neon is suspended or credentials are wrong, `db` will contain `"error: ..."` while preserving an HTTP 200 response to prevent unhandled process crashes.

### 8.2 Testing Authentication Flow via CLI

You can verify the production backend APIs directly before opening the frontend:

```bash
BACKEND="https://<your-backend-domain>"

# 1. Register a test user
curl -i -X POST "$BACKEND/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"prod_test@readflow.dev","password":"Password123","displayName":"Prod Tester"}'

# 2. Login
curl -i -X POST "$BACKEND/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"prod_test@readflow.dev","password":"Password123"}'
# Save the returned "accessToken"

# 3. Access Protected Route
curl -i "$BACKEND/api/v1/auth/me" \
  -H "Authorization: Bearer <TOKEN_FROM_STEP_2>"
```

---

## 9. End-to-End Production Verification Checklist

Print or follow this checklist when deploying:

### Infrastructure
- [ ] Backend deployed to Vercel with Root Directory set to `backend`.
- [ ] Backend build command executes `prisma generate`.
- [ ] Frontend deployed to Vercel with Root Directory set to `frontend`.
- [ ] Frontend framework detected as `Vite` with output directory `dist`.
- [ ] No private secrets (`JWT_SECRET`, `DATABASE_URL`) exposed in frontend bundle (check Network tab for `assets/index-*.js`).

### Database
- [ ] Neon project and branch confirmed (`winter-night-03430231` / `production`).
- [ ] `prisma migrate deploy` completed with 0 errors.
- [ ] Neon compute endpoint has `&connect_timeout=15` in connection strings.
- [ ] `GET /api/v1/health` reports `"db": "ok"`.

### CORS & Cookies
- [ ] `FRONTEND_ORIGINS` in backend matches the exact production frontend URL.
- [ ] Browser console has 0 CORS preflight or origin-mismatch errors.
- [ ] Login returns `rf_refresh` cookie with `SameSite=None` and `Secure=true`.

### Frontend & PWA
- [ ] Direct browser navigation to `/login` loads correctly (no 404).
- [ ] Direct browser navigation to `/register` loads correctly.
- [ ] User can register a new account through the UI.
- [ ] User is redirected to `/` and sees profile details.
- [ ] Unauthenticated access to `/` redirects cleanly to `/login`.
- [ ] Logout clears the session and returns user to `/login`.
- [ ] Service worker registers successfully in browser (`Application` → `Service Workers`).

---

## 10. Troubleshooting Guide

| Symptom | Probable Cause | Diagnostic Action | Corrective Action |
|---|---|---|---|
| **Vercel Frontend build fails** | Missing dependency or wrong Root Directory | Check Vercel build log for `command not found` or module errors. | Ensure Root Directory is set to `frontend` and framework is `Vite`. |
| **Direct navigation to `/login` returns 404** | Missing SPA rewrite rule | Open `https://domain.com/login` directly in browser. | Ensure [frontend/vercel.json](file:///c:/Users/ADMIN/Desktop/Project/PersonalReader/frontend/vercel.json) contains rewrite rule for `/index.html`. |
| **Backend returns 500 on all queries** | Prisma Client not generated on Vercel | Check Vercel Function logs for `Cannot find module '@prisma/client'`. | Verify [backend/package.json](file:///c:/Users/ADMIN/Desktop/Project/PersonalReader/backend/package.json) has `"build": "prisma generate"`. |
| **`Can't reach database server at ...`** | Neon endpoint suspended or timeout | Check `GET /api/v1/health` for DB error message. | Append `&connect_timeout=15` to `DATABASE_URL` in backend Vercel environment variables. |
| **CORS error: `origin not allowed`** | `FRONTEND_ORIGINS` missing or mismatched | Inspect browser DevTools Console for `Access-Control-Allow-Origin` error. | Update `FRONTEND_ORIGINS` in backend Vercel project settings to match frontend domain (e.g. `https://readflow.vercel.app`). |
| **Refresh token not sent on Safari** | Third-party cookie blocked by ITP | Check Network tab for missing `Cookie` header on `/api/v1/auth/refresh`. | ReadFlow automatically falls back to `X-Refresh-Token` header and body payload. Verify `rf_refresh_token` exists in `localStorage`. |
| **Prisma migration fails: P1001** | Using pooled URL for migrations | Check terminal error when running `prisma migrate deploy`. | Ensure migration command uses `DIRECT_URL` (unpooled hostname without `-pooler`). |
| **Login succeeds locally, fails in prod** | `NODE_ENV=production` sets `secure: true` on cookies over plain HTTP | Inspect request URL protocol. | Ensure your production frontend and backend domains use `https://`. |

---

## 11. Rollback, Recovery & Incident Response

### 11.1 Frontend Rollback
1. In the Vercel Dashboard, navigate to the `readflow` project.
2. Go to **Deployments**.
3. Locate the previous stable deployment.
4. Click the three dots (`...`) → **Instant Rollback**.
5. Vercel immediately redirects production traffic to the selected deployment without rebuilding.

### 11.2 Backend Rollback
1. In the Vercel Dashboard, navigate to the `readflow-api` project.
2. Go to **Deployments**.
3. Select the previous stable deployment → **Instant Rollback**.
4. Verify `/api/v1/health` on the rolled-back deployment.

### 11.3 Database Rollback Strategy

> [!IMPORTANT]
> - Do not roll back database schema by dropping tables or resetting migrations.
> - Follow the **expand-and-contract** migration pattern: ensure database migrations are backward-compatible with previous application code.
> - If an applied migration causes issues, author a new forward migration that reverses the offending columns/tables, test it locally, and deploy using `npx prisma migrate deploy`.

---

## 12. Official Documentation References

- [Vercel Express Deployment Guide](https://vercel.com/docs/frameworks/backend/express)
- [Vercel Monorepos Configuration](https://vercel.com/docs/monorepos)
- [Vercel Single Page Applications (Rewrites)](https://vercel.com/docs/projects/project-configuration#rewrites)
- [Neon Connection Pooling & PgBouncer](https://neon.com/docs/connect/connection-pooling)
- [Neon & Prisma Best Practices](https://neon.com/docs/guides/prisma)
- [MDN Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
