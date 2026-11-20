# Implementation Plan

## Phase 0 – Project Foundation ✅
- Repository structure
- Frontend (React + Vite + PWA config)
- Backend (Express + Vercel serverless)
- Prisma schema
- Documentation
- Environment variable templates

## Phase 1 – Database & Authentication ✅
- Neon database connection verified
- Initial Prisma migration `init_auth` created and applied
- User & RefreshToken models implemented
- User registration & login (bcrypt + JWT + refresh token rotation)
- Auth middleware (`authenticate`, `authorizeOwner`)
- Protected and guest frontend routes
- Responsive Login and Register UI with form validation
- Axios interceptor with concurrent refresh queueing
- 18 backend automated tests & 6 frontend tests passing

## Phase 2 – Book Library & R2 Upload
- Cloudflare R2 storage service
- Pre-signed PUT URL generation
- Direct browser-to-R2 upload flow
- Upload completion verification
- Book library API (list, detail, delete)
- Library UI

## Phase 3 – PDF Reader
- PDF.js integration
- Page rendering
- Navigation, zoom, fit-to-width
- Reading progress persistence (debounced)
- Continue-reading support

## Phase 4 – Translation & Vocabulary
- Gemini API backend integration
- Translation endpoint with caching
- Text selection popup in reader
- Vocabulary CRUD API
- Vocabulary management UI

## Phase 5 – Bookmarks, Highlights & Notes
- Annotation APIs
- Reader annotation interactions
- Navigation to annotated pages
- Annotation list UI

## Phase 6 – Offline & Synchronisation
- Dexie.js IndexedDB setup
- Explicit PDF download for offline
- Sync queue & retry
- Conflict resolution per entity type
- Multi-device sync verification

## Phase 7 – PWA & Hardening
- PWA manifest & icons
- Workbox service worker
- Security audit
- Performance optimisation
- Tests (backend: Node test runner; frontend: Vitest)
- Mobile & desktop verification

## Phase 8 – Deployment
- Vercel frontend deployment
- Vercel backend deployment
- Neon production database
- R2 production bucket
- Production environment variables
- Production migrations
- End-to-end production test
