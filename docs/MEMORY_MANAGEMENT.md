# ReadFlow Memory Management & Resource Limits

## 1. Configurable Resource Limits

| Environment Variable | Default | Purpose |
|---|---|---|
| `MAX_IMPORT_PDF_BYTES` | `10485760` (10 MB) | Rejects oversized multipart PDFs before processing |
| `MAX_PDF_PAGES` | `500` | Prevents runaway extraction on massive PDFs |
| `MAX_CONCURRENT_IMPORT_JOBS` | `3` | Caps simultaneous in-memory PDF jobs (~30 MB max raw buffer footprint) |
| `PDF_PROCESSING_TIMEOUT_MS` | `45000` (45s) | Aborts stalled extraction jobs cleanly |
| `MAX_EXTRACTED_HTML_BYTES` | `15728640` (15 MB) | Caps total generated HTML persisted per book |

## 2. Memory Release Lifecycle
1. **Zero Disk & Zero Global Retention**: `multer.memoryStorage()` holds the buffer only for the duration of the request/pipeline. No global arrays or queues store PDF buffers.
2. **Immediate Reference Release**:
   - `req.file.buffer = null` immediately after passing to `BookImportService`.
   - Inside `_runInMemoryPipeline`, `localBuffer = null` as soon as `extractPdfFromMemory()` completes, and `extracted = null` as soon as `transformPagesToStructuredHtml()` completes.
3. **PDF.js Cleanup**: `page.cleanup()` is called after every page, and `pdfDoc.destroy()` + `loadingTask.destroy()` are guaranteed in `finally` blocks.
4. **Batched DB Persistence**: `BookContent` rows are inserted in batches of 25 (`DB_BATCH_SIZE = 25`) inside a transaction to avoid large query parameter buffers.
5. **Failure & Cancellation**: Cancelled or failed jobs delete any partial `BookContent`/`BookChapter` rows and release all references in `finally`.
