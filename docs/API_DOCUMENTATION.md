# ReadFlow API Documentation (Phase 1 & Phase 2)

All protected endpoints require: `Authorization: Bearer <ACCESS_TOKEN>`.  
Books endpoints are mounted at `/api/v1/books` (and aliased at `/api/books`).

## Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`

## In-Memory PDF Import (`/api/v1/books/import`)
- `POST /api/v1/books/import` (`multipart/form-data`: `file`, `title`, `author`, `description`, `language`)
  - Validates `.pdf`, MIME type, `%PDF-` signature, and size (`MAX_IMPORT_PDF_BYTES`).
  - Extracts text via PDF.js in memory, transforms to sanitized HTML chunks, persists to Neon, and releases buffers.
  - Returns `201 Created` `{ book, job }` (or `202 Accepted` when `ASYNC_PDF_IMPORT=true&async=true`, `422 NEEDS_OCR` for scanned PDFs).
- `GET /api/v1/books/import/:jobId` – Returns import job status & progress (owner only).
- `POST /api/v1/books/import/:jobId/cancel` – Cancels an active import job (owner only).

## Book Library & Structured Content (`/api/v1/books`)
- `GET /api/v1/books?page=1&limit=12&search=&sort=newest` – Lists completed books of authenticated user (`sort`: `newest`, `oldest`, `updated`, `title`).
- `GET /api/v1/books/:bookId` – Returns book metadata (owner only).
- `GET /api/v1/books/:bookId/contents?page=1&limit=10` – Returns ordered sanitized HTML chunks (`BookContent`) with pagination.
- `GET /api/v1/books/:bookId/chapters` – Returns detected `BookChapter` list ordered by sequence.
- `PATCH /api/v1/books/:bookId` – Updates `title`, `author`, `description`, `language`.
- `DELETE /api/v1/books/:bookId` – Soft-deletes book and cleans up related records.
