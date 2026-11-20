# ReadFlow Development Setup Guide

## 1. Prerequisites

- **Node.js**: v20+ (tested with v24.15.0)
- **npm**: v10+ (tested with v11.12.1)
- **Git**
- **Neon PostgreSQL**: Free tier account (https://neon.tech)

## 2. Environment Setup

### Backend

Create `backend/.env.local`:

```env
# Neon PostgreSQL Connection Strings
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/readflow?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/readflow?sslmode=require"

# JWT Secret (minimum 32 characters)
JWT_SECRET="your-development-jwt-secret-min-32-chars-long"

# Runtime
NODE_ENV="development"
PORT=3001
FRONTEND_ORIGINS="http://localhost:5173"

# Storage limits
MAX_PDF_SIZE_BYTES=52428800
MAX_USER_STORAGE_BYTES=524288000
```

### Frontend

Create `frontend/.env.local`:

```env
VITE_API_BASE_URL="http://localhost:3001"
VITE_APP_NAME="ReadFlow"
```

## 3. Database Migrations

Apply database migrations:

```bash
cd backend
npm run db:migrate        # Applies local dev migrations
# or for deployment:
npm run db:migrate:deploy # Production migration deploy
```

Generate Prisma Client:

```bash
npm run db:generate
```

## 4. Running Locally

### Start Backend Development Server

```bash
cd backend
npm run dev
# Server runs on http://localhost:3001
```

### Start Frontend Development Server

```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

## 5. Running Automated Tests

### Backend Tests

```bash
cd backend
npm test
# Executes node --env-file-if-exists=.env.local --test tests/**/*.test.js
```

### Frontend Tests

```bash
cd frontend
npm test
# Executes Vitest test suite
```

### Build Verification

```bash
cd frontend
npm run build
# Compiles Vite production bundle + Service Worker
```
