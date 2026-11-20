/**
 * Dexie.js database definition.
 * Tables are populated progressively; schema version is bumped for each change.
 */
import Dexie from 'dexie'

const db = new Dexie('ReadFlowDB')

db.version(1).stores({
  // Offline PDF blobs (explicit download by user)
  pdfBlobs: 'bookId, downloadedAt',

  // Cached book metadata for offline use
  bookCache: 'id, updatedAt',

  // Local reading progress (pending sync)
  readingProgress: 'bookId, updatedAt',

  // Offline annotation queue (pending sync)
  syncQueue: '++id, entityType, entityId, operation, createdAt',
})

export default db
