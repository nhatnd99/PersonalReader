# ReadFlow Database Schema Documentation

**Database Engine**: PostgreSQL (Neon Free Tier)  
**ORM**: Prisma 5 (`backend/prisma/schema.prisma`)

## Migrations History
1. `20261120162942_init_auth`: `users`, `refresh_tokens`
2. `20261121171412_add_books_and_storage`: `books`, `book_files`, `upload_sessions`
3. `20261126142915_add_book_language`: Adds nullable `language` column to `books`

### Safe Migration Command
```bash
npx prisma migrate deploy
```
*(Uses `DIRECT_URL` to bypass PgBouncer pooling during schema migrations. Never run `prisma migrate reset` in production.)*

## Models

### `User` (`users`)
- `id` (`UUID`, PK)
- `email` (`String`, Unique, Indexed)
- `passwordHash` (`String`)
- `displayName` (`String`)
- `avatarUrl` (`String?`)
- `isActive` (`Boolean`, default `true`)
- `emailVerified` (`Boolean`, default `false`)
- Relations: `refreshTokens`, `books`, `uploadSessions`

### `Book` (`books`)
- `id` (`UUID`, PK)
- `userId` (`UUID`, FK -> `users.id`, `ON DELETE CASCADE`)
- `title` (`String`)
- `author` (`String?`)
- `description` (`String?`)
- `originalFileName` (`String`)
- `coverImageUrl` (`String?`)
- `language` (`String?`)
- `status` (`String`: `'pending' | 'ready' | 'error' | 'deleted'`)
- `pageCount` (`Int?`)
- `createdAt`, `updatedAt`, `deletedAt` (`DateTime?`)
- Indexes: `(userId)`, `(status)`, `(userId, status, createdAt)`

### `BookFile` (`book_files`)
- `id` (`UUID`, PK)
- `bookId` (`UUID`, FK -> `books.id`, `ON DELETE CASCADE`)
- `storageProvider` (`String`, default `'r2'`)
- `bucket` (`String`)
- `objectKey` (`String`, Unique: `users/{userId}/books/{bookId}/{uuid}.pdf`)
- `originalFileName`, `mimeType`, `fileSize` (`Int`), `checksum` (`String?`), `uploadStatus`

### `UploadSession` (`upload_sessions`)
- `id` (`UUID`, PK)
- `userId` (`UUID`, FK -> `users.id`, `ON DELETE CASCADE`)
- `bookId` (`UUID?`, FK -> `books.id`, `ON DELETE SET NULL`)
- `objectKey` (`String`, Unique)
- `originalFileName`, `mimeType`, `expectedFileSize` (`Int`)
- `status` (`'pending' | 'completed' | 'cancelled' | 'expired' | 'failed'`)
- `expiresAt` (`DateTime`)
