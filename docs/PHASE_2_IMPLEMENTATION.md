# Phase 2 – Book Library & Cloudflare R2 Integration

## 1. Overview
Phase 2 delivers a personal digital book library and direct-to-object-storage PDF upload architecture built on:
- **Frontend**: React 18 + Vite + JavaScript + Responsive CSS + Vite PWA
- **Backend**: Node.js + Express.js + AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- **Database**: Neon PostgreSQL + Prisma ORM
- **File Storage**: Cloudflare R2 (private bucket, zero egress fees)

## 2. Architecture & Design Adjustments
- **CSS Architecture**: The existing frontend uses clean CSS variables (`global.css`, `auth.css`) without a Tailwind dependency. Responsive styling (`library.css`) was implemented using standard CSS breakpoints (480px, 768px, 1024px) and `env(safe-area-inset-*)` to preserve zero unnecessary dependencies.
- **API Prefix Convention**: Existing Phase 1 endpoints use `/api/v1/auth` and `/api/v1/health`. Phase 2 preserves this convention with `/api/v1/uploads/*` and `/api/v1/books/*`, while supporting `/api/v1/books/:bookId/file-url` as an alias for `/download-url`.

## 3. Implemented Capabilities
- **Direct-to-R2 Pre-signed Upload**: Browser uploads PDF bytes directly to Cloudflare R2; Vercel Serverless Functions never buffer file bytes.
- **Multi-file Upload Queue**: Users can select or drag-and-drop multiple PDFs, track independent progress bars, cancel/retry individual files, and minimize the dialog so the library remains non-blocking.
- **Server-Side Verification**: `complete` verifies object presence via `HeadObjectCommand`, checks file size, and validates `%PDF-` magic bytes via a `bytes=0-7` range request.
- **Responsive Library UI**: Grid & List views, debounced search, sorting (`newest`, `oldest`, `updated`, `title`), loading skeletons, pagination, Book Details modal (with Phase 3 Reader placeholder), Edit modal (including `language`), and Delete confirmation.
- **PWA Safety**: Added missing `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, and `favicon.ico`. Workbox caches only the static app shell and excludes `/api/` and private R2 URLs.
