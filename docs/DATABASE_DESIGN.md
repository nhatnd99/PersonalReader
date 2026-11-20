# Database Design – ReadFlow

## 1. Overview & Strategy

ReadFlow uses **Neon PostgreSQL (Free Tier)** managed via **Prisma ORM**.
To adhere to zero-cost constraints and avoid empty unused database tables, models are introduced incrementally in each respective implementation phase.

## 2. Implemented Schema (Phase 1)

### User Model (`users`)

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | UUID | `@id @default(uuid())` | Primary key |
| `email` | String | `@unique` | Normalized unique email |
| `passwordHash` | String | `@map("password_hash")` | Bcrypt password hash (never exposed in API) |
| `displayName` | String | `@map("display_name")` | User's full or screen name |
| `avatarUrl` | String? | `@map("avatar_url")` | Optional profile image URL |
| `isActive` | Boolean | `@default(true)` | Account active status |
| `emailVerified` | Boolean | `@default(false)` | Email verification flag |
| `createdAt` | DateTime | `@default(now())` | Account creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Account modification timestamp |

### RefreshToken Model (`refresh_tokens`)

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | UUID | `@id @default(uuid())` | Primary key |
| `userId` | UUID | `@map("user_id")` | Foreign key referencing `users.id` (Cascade delete) |
| `tokenHash` | String | `@unique @map("token_hash")` | SHA-256 hash of raw refresh token |
| `family` | UUID | `@db.Uuid` | Family identifier for token rotation & reuse detection |
| `isRevoked` | Boolean | `@default(false)` | Revocation status flag |
| `expiresAt` | DateTime | `@map("expires_at")` | Token expiry timestamp (7 days) |
| `createdAt` | DateTime | `@default(now())` | Token issue timestamp |

## 3. Future Domain Compatibility & Planned Models

These entities will belong to `User` (`userId` foreign key) and are planned for subsequent phases:

- **Book** (Phase 2): Book metadata (`title`, `author`, `status`, `coverUrl`, `pageCount`, `fileSize`, `userId`).
- **BookFile** (Phase 2): Cloudflare R2 reference key (`r2Key`, `bookId`, `fileSize`, `mimeType`).
- **UploadSession** (Phase 2): Upload lifecycle (`status`, `expiresAt`, `bookId`).
- **ReadingProgress** (Phase 3): Progress tracking (`currentPage`, `totalPages`, `percentage`, `version`, `bookId`, `userId`).
- **Vocabulary** (Phase 4): Word, translation, definition, context snippet (`word`, `translation`, `bookId`, `userId`).
- **Bookmark** (Phase 5): Page bookmark (`pageNumber`, `label`, `bookId`, `userId`).
- **Highlight** (Phase 5): Highlighted text (`selectedText`, `color`, `pageNumber`, `bookId`, `userId`).
- **BookNote** (Phase 5): Annotations (`content`, `pageNumber`, `bookId`, `userId`).

## 4. Ownership & User Isolation Rules

1. **Backend Derivation**: User identity is derived strictly from verified JWT claims (`req.user.sub`). Never trust client-sent `userId`.
2. **Cascade Deletes**: Deleting a User cleanly cascades to all owned entities, preventing orphan records.
3. **Indexes**: All tables with `userId` will carry explicit indexes to ensure fast queries without full table scans on Neon.
