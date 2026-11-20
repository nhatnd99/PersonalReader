# PWA & Offline Support

## Service Worker Strategy

- **App shell** (HTML, JS, CSS, fonts, icons): CacheFirst via Workbox
- **Static images**: CacheFirst with 30-day expiry
- **API responses**: NOT cached by service worker (private data)
- **Pre-signed URLs**: NOT cached (they expire)
- **PDF blobs**: NOT stored in Cache Storage (IndexedDB instead)

## Offline PDF Storage

User explicitly downloads a book for offline reading:

1. User clicks "Download for offline"
2. Frontend fetches pre-signed GET URL from backend
3. Frontend fetches PDF blob
4. PDF blob stored in `ReadFlowDB.pdfBlobs` (Dexie.js / IndexedDB)
5. Book marked as available offline

## Sync Queue

Offline changes (annotations, progress) are stored in `ReadFlowDB.syncQueue`.
When online, the queue is drained in order:
- Reading progress: PATCH /api/v1/books/:id/progress
- Bookmarks: POST/DELETE
- Highlights: POST/PATCH/DELETE
- Notes: POST/PATCH/DELETE

Conflict resolution:
- Progress: version-aware last-write-wins
- Notes/Highlights: version mismatch reported to user for manual resolution

## Update Notification

When a new service worker is waiting, a banner asks the user to reload.
Never silently force-reload; the user may be reading.

## Storage Quota Errors

If IndexedDB write fails due to storage quota:
- Show clear error: "Not enough device storage to download this book."
- Do not silently fail or corrupt existing data.
