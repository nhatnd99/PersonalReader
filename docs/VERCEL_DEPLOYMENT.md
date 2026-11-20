# Vercel Deployment Guide

ReadFlow uses two separate Vercel projects from the same Git repository.

## Frontend Project

| Setting | Value |
|---------|-------|
| Repository | readflow (monorepo root) |
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

### Environment Variables (Frontend)

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Full backend URL, e.g. `https://readflow-api.vercel.app` |
| `VITE_APP_NAME` | App display name |

## Backend Project

| Setting | Value |
|---------|-------|
| Repository | readflow (monorepo root) |
| Root Directory | `backend` |
| Framework Preset | Other |
| Build Command | `npm run build` |
| Output Directory | *(leave blank)* |
| Install Command | `npm install` |

### Environment Variables (Backend)

See `backend/.env.example` for the full list. Required at deployment:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- `GEMINI_API_KEY`, `GEMINI_MODEL`
- `FRONTEND_ORIGINS` (comma-separated list of allowed origins)
- `NODE_ENV=production`

## Important Notes

- Do NOT call `app.listen()` in `api/index.js`.
- The Express app is exported as the Vercel function default export.
- Keep `server.js` (which calls `app.listen()`) only for local development.
- Vercel Hobby has a 10-second function timeout. Keep handlers fast.
- PDF binaries are NEVER proxied through Vercel Functions.
