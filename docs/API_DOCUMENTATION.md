# ReadFlow API Documentation (Phase 1 & Phase 2)

All protected endpoints require:
`Authorization: Bearer <ACCESS_TOKEN>`

## Health & Authentication (`/api/v1`)
- `GET /api/v1/health` – Service and Neon DB health check
- `POST /api/v1/auth/register` – Register user
- `POST /api/v1/auth/login` – Login and issue JWT + refresh cookie/token
- `POST /api/v1/auth/refresh` – Rotate refresh token
- `POST /api/v1/auth/logout` – Revoke refresh token family
- `GET /api/v1/auth/me` – Get authenticated user profile

## Uploads (`/api/v1/uploads`)
- `POST /api/v1/uploads/initiate` – Validates PDF metadata, enforces 50MB file / 500MB user quota, creates pending `Book` & `UploadSession`, returns 15-min pre-signed PUT URL.
- `POST /api/v1/uploads/:uploadId/complete` – Idempotent. Verifies R2 object via `HeadObject` and `%PDF-` magic header via `bytes=0-7`, creates `BookFile`, sets book status to `ready`.
- `GET /api/v1/uploads/:uploadId` – Get upload session status (owner only).
- `POST /api/v1/uploads/:uploadId/refresh-url` – Issue fresh pre-signed PUT URL.
- `POST /api/v1/uploads/:uploadId/cancel` – Cancel session, soft-delete pending book, and clean up R2 object.

## Books (`/api/v1/books`)
- `GET /api/v1/books?page=1&limit=20&search=&sort=newest` – List authenticated user's active books (`sort`: `newest`, `oldest`, `updated`, `title`).
- `GET /api/v1/books/:bookId` – Get book details and file metadata (owner only).
- `PATCH /api/v1/books/:bookId` – Update `title`, `author`, `description`, `language` (owner only).
- `DELETE /api/v1/books/:bookId` – Soft-delete book in Neon and delete object from R2 (owner only).
- `GET /api/v1/books/:bookId/download-url` (alias: `/api/v1/books/:bookId/file-url`) – Rate-limited; returns 5-minute pre-signed GET URL.
