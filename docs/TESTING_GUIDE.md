# ReadFlow Testing & Verification Guide

## 1. Automated Backend Tests
Uses Node.js built-in test runner (`node --test`) with mocked S3/R2 client operations (`setS3Client`) and live/test Neon database queries:
```bash
cd backend
npm test
```
Covers:
- App health, 404, CORS & Helmet CORP headers (7 tests)
- Auth registration, login, JWT validation, refresh token rotation & reuse detection (16 tests)
- Upload initiation, validation, ownership, expiration, cancellation, HeadObject & `%PDF-` signature checks, idempotent completion, book CRUD, search, sorting, signed URLs (23 tests)

## 2. Automated Frontend Tests
Uses Vitest:
```bash
cd frontend
npm test
```
Covers:
- Auth validation & token storage (4 tests)
- App smoke tests (2 tests)
- Library formatters, PDF validation, 50MB limit, filtering/sorting, upload states, PWA icon existence (7 tests)

## 3. Production Builds & PWA Verification
```bash
cd frontend && npm run build
cd ../backend && npm run build
```
Verify in `frontend/dist/`:
- `manifest.webmanifest`, `sw.js`, `icons/icon-192.png`, `icons/icon-512.png`, `apple-touch-icon.png` are generated.
- Service worker precaches static app shell only; `/api/` and `*.r2.cloudflarestorage.com` are never cached.
