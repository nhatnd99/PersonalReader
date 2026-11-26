# ReadFlow Database Schema Documentation

**Database Engine**: PostgreSQL (Neon Free Tier)  
**ORM**: Prisma 5 (`backend/prisma/schema.prisma`)

## Migrations History
1. `20261120162942_init_auth`: `users`, `refresh_tokens`
2. `20261121171412_add_books_and_storage`: `books`, `book_files`, `upload_sessions`
3. `20261126142915_add_book_language`: Adds `language` to `books`
4. `20261126150457_add_in_memory_pdf_html_storage`: Adds `total_pages`, `total_words`, `processing_status` to `books`; creates `book_contents`, `book_chapters`, and `book_import_jobs`

## Core Models

### `Book` (`books`)
- `id`, `userId`, `title`, `author`, `description`, `originalFileName`, `language`
- `totalPages`, `totalWords`, `processingStatus` (`PENDING | PROCESSING | COMPLETED | FAILED | NEEDS_OCR | CANCELLED`), `status` (`pending | ready | error | deleted`)
- `createdAt`, `updatedAt`, `deletedAt`

### `BookContent` (`book_contents`)
- `id`, `bookId`, `sequence` (unique per book)
- `contentHtml` (`TEXT`), `plainText` (`TEXT`), `sourcePageStart`, `sourcePageEnd`, `wordCount`

### `BookChapter` (`book_chapters`)
- `id`, `bookId`, `title`, `sequence` (unique per book), `startContentSequence`, `endContentSequence`

### `BookImportJob` (`book_import_jobs`)
- `id`, `userId`, `bookId`, `status`, `progress` (0–100), `currentStep`, `errorMessage`, `createdAt`, `updatedAt`, `completedAt`
- Stores processing metadata **only** (never PDF bytes, disk paths, or object keys).
