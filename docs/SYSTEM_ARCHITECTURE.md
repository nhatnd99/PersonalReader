# System Architecture

## Components

```
Browser (PWA)
  │
  ├── React + Vite (Vercel Hobby – frontend)
  │     ├── PDF.js renderer
  │     ├── Dexie.js (IndexedDB) – offline storage
  │     └── Service Worker – app shell caching
  │
  └── Express.js API (Vercel Hobby – backend Serverless Functions)
        ├── Neon PostgreSQL via Prisma – relational data
        ├── Cloudflare R2 – PDF file storage
        └── Gemini API Free Tier – translation

Cloud Storage (R2):  User PDFs only. No binary data in PostgreSQL.
Database (Neon):     Metadata, progress, annotations, vocabulary.
Translation (Gemini): Text snippets only. Never full PDFs.
```

## Request Flows

### PDF Upload
1. Browser → POST /api/v1/uploads/initiate → Backend creates Book + UploadSession + pre-signed PUT URL
2. Browser → PUT pre-signed URL → R2 (direct, no backend proxy)
3. Browser → POST /api/v1/uploads/:id/complete → Backend verifies R2 object, marks Book READY

### Reading
1. Browser → GET /api/v1/books/:id/url → Backend generates short-lived GET pre-signed URL
2. Browser → fetch PDF from R2 (pre-signed URL)
3. PDF.js renders in browser
4. Reading progress debounced → PATCH /api/v1/books/:id/progress

### Translation
1. User selects text in PDF
2. Browser → POST /api/v1/translation → Backend calls Gemini with snippet only
3. Backend returns translation; caches result
4. User can save word to vocabulary
