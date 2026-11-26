# ReadFlow In-Memory PDF Processing Architecture

## 1. Core Architectural Decision
ReadFlow processes uploaded PDFs **strictly in server memory** and persists only **structured, sanitized HTML** and **plain text chunks** in Neon PostgreSQL.
- **No external object storage** (no R2, S3, Backblaze, or Firebase).
- **No local disk writes** (uses `multer.memoryStorage()`, zero temporary files).

## 2. Processing Pipeline
1. **Multipart Upload**: Frontend sends `multipart/form-data` (`file`, `title`, `author`, `language`) to `POST /api/v1/books/import` (or `/api/books/import`).
2. **In-Memory Validation**: Checks `.pdf` extension, MIME type, file size (`MAX_IMPORT_PDF_BYTES`), and `%PDF-` magic header.
3. **PDF.js Extraction (`pdfExtractor.js`)**: Loads `Uint8Array` via `pdfjs-dist/legacy/build/pdf.mjs` (`disableFontFace: true`, `isEvalSupported: false`), extracts text items with `(x, y)` coordinates and font sizes page-by-page, and detects scanned PDFs (`NEEDS_OCR`).
4. **HTML Transformation (`htmlTransformer.js`)**:
   - Strips repeated headers/footers across pages.
   - Computes median body font size to classify `h1`, `h2`, `h3`, `ul`/`ol`, and `p` blocks.
   - Splits content into ordered `BookContent` chunks (~800–1400 words) without breaking paragraphs.
   - Records `BookChapter` ranges (`startContentSequence`..`endContentSequence`).
5. **HTML Sanitization (`htmlSanitizer.js`)**: Strips `<script>`, `<iframe>`, `<style>`, event handlers, `javascript:` URLs, and all tag attributes.
6. **Batched PostgreSQL Persistence**: Saves chunks in batches of 25 inside a Prisma transaction and updates `BookImportJob` to `COMPLETED`.

## 3. Hosting & Serverless Considerations
- **Vercel Serverless Functions**: Enforces a 4.5 MB request payload limit and 10s–60s execution timeout. On Vercel, `POST /api/v1/books/import` runs synchronously within the request lifecycle so the function is not terminated early.
- **Persistent Node.js Service**: Set `ASYNC_PDF_IMPORT=true` on a persistent Node host (e.g. Render/Railway) to accept larger PDFs (up to `MAX_IMPORT_PDF_BYTES=10485760`) and return `202 Accepted` while the client polls `GET /api/v1/books/import/:jobId`.

## 4. Known Limitations
- Scanned/image-only PDFs return `422 NEEDS_OCR` (OCR is out of scope for Phase 2).
- Password-protected PDFs are rejected (`400 PASSWORD_PROTECTED_PDF`).
- Complex multi-column magazine layouts or tables may flatten into sequential paragraphs.
