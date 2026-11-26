# Phase 2 – In-Memory PDF Processing & Structured HTML Storage

## 1. Summary
Phase 2 converts uploaded PDFs **directly in server memory** into **sanitized, structured HTML chunks** stored in Neon PostgreSQL, eliminating external object storage (R2/S3) and local disk writes.

## 2. Core Pipeline
`PDF Upload (multipart/form-data)` → `Multer MemoryStorage` → `PDF.js In-Memory Extraction (Uint8Array)` → `Semantic HTML Transformation` → `HTML Sanitization` → `Batched Neon PostgreSQL Persistence` → `Memory & PDF.js Cleanup`.

## 3. Implemented Components
- **Backend**:
  - `backend/src/services/pdf/pdfExtractor.js`: Page-by-page PDF.js extraction, `%PDF-` signature validation, password/corrupt/scanned (`NEEDS_OCR`) detection, guaranteed `destroy()`.
  - `backend/src/services/pdf/htmlTransformer.js`: Font-size & position heuristics for `h1`/`h2`/`h3`, `ul`/`ol`, `p`, header/footer removal, ordered chunking (~800 words), chapter detection.
  - `backend/src/services/pdf/htmlSanitizer.js`: Deterministic allowlist sanitizer (`section`, `h1`-`h3`, `p`, `ul`, `ol`, `li`, `blockquote`, `strong`, `em`), zero attributes/scripts.
  - `backend/src/modules/books/bookImport.service.js`: Concurrency cap, timeout, batched DB writes, job lifecycle (`PENDING` → `PROCESSING` → `COMPLETED` / `FAILED` / `NEEDS_OCR` / `CANCELLED`).
- **Frontend**:
  - `BookUploadModal.jsx`: Multi-file drag-and-drop / mobile picker, upload vs. processing progress indicators, `NEEDS_OCR` handling, cancel & retry, non-blocking minimize pill.
  - `BookDetailsModal.jsx`: Displays pages, word count, language, detected chapters, and live sanitized HTML preview.
- **PWA & Responsive**:
  - Icons generated in `frontend/public/icons/`, Workbox excludes `/api/` from precache fallback, responsive breakpoints in `library.css`.
