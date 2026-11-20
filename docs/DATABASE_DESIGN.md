# Database Design

## Entity Relationship Summary

```
User ──< Book ──< BookFile         (1:1 PDF reference in R2)
              ──< UploadSession    (1:1 upload lifecycle)
              ──< ReadingProgress  (1:1 per-book progress)
              ──< Vocabulary       (1:many words saved from book)
              ──< Bookmark         (1:many page bookmarks)
              ──< Highlight        (1:many text highlights)
              ──< BookNote         (1:many notes)
User ──< Vocabulary (global vocabulary, not tied to a specific book)
```

## Key Design Decisions

- `Book.status` guards the upload lifecycle (PENDING → UPLOADING → READY | ERROR).
- `BookFile.r2Key` is the sole reference to the PDF binary; no blob stored in PG.
- `ReadingProgress.version` supports optimistic concurrency (last-version-wins for progress).
- `Highlight.version` and `BookNote.version` support per-item conflict detection.
- All foreign keys cascade-delete to prevent orphaned records.
- `User.storageUsed` is updated transactionally with book uploads/deletes.
- Indexes on `userId` for all user-owned tables to prevent full scans.
