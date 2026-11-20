# ReadFlow

A personal PDF reading and English–Vietnamese vocabulary learning Progressive Web App (PWA).

## Architecture

| Component | Technology | Hosting |
|---|---|---|
| Frontend | React + Vite + JavaScript | Vercel Hobby |
| Backend | Node.js + Express.js | Vercel Hobby Functions |
| Database | PostgreSQL + Prisma | Neon Free |
| PDF Storage | Cloudflare R2 | R2 Free allowance |
| AI Translation | Gemini API Free Tier | Backend |
| Local Storage | IndexedDB + Dexie.js | Browser |
| PWA | Vite PWA Plugin | Vercel |

## Zero-Cost Architecture

This project is designed to operate entirely within free-tier limits of each provider. No paid services are required.

## Monorepo Layout

```
readflow/
├── frontend/   – React Vite PWA
├── backend/    – Express.js Vercel Functions
└── docs/       – Architecture & setup documentation
```

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Run frontend dev server
npm run dev:frontend

# Run backend dev server
npm run dev:backend
```

See `docs/IMPLEMENTATION_PLAN.md` for the full roadmap.
