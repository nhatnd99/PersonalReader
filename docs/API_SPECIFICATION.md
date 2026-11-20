# API Specification

Base URL: `${BACKEND_URL}/api/v1`

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /health | None | Service health + DB ping |

## Auth (Phase 1)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | None | Register new user |
| POST | /auth/login | None | Login, return JWT |
| POST | /auth/logout | JWT | Invalidate token |
| GET | /auth/me | JWT | Get current user |
| PATCH | /auth/me | JWT | Update profile |

## Books (Phase 2)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /books | JWT | List user's books |
| GET | /books/:id | JWT | Get book details |
| DELETE | /books/:id | JWT | Delete book + R2 file |
| GET | /books/:id/url | JWT | Get short-lived read URL |
| GET | /books/:id/progress | JWT | Get reading progress |
| PATCH | /books/:id/progress | JWT | Update reading progress |

## Uploads (Phase 2)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /uploads/initiate | JWT | Create book + pre-signed PUT URL |
| POST | /uploads/:id/complete | JWT | Verify upload and mark book READY |

## Vocabulary (Phase 4)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /vocabulary | JWT | List vocabulary (filterable by bookId) |
| POST | /vocabulary | JWT | Save word |
| PATCH | /vocabulary/:id | JWT | Update word/note |
| DELETE | /vocabulary/:id | JWT | Delete word |

## Translation (Phase 4)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /translation | JWT | Translate word/phrase (Gemini) |

## Bookmarks (Phase 5)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /books/:id/bookmarks | JWT | List bookmarks |
| POST | /books/:id/bookmarks | JWT | Add bookmark |
| DELETE | /books/:id/bookmarks/:bmId | JWT | Remove bookmark |

## Highlights (Phase 5)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /books/:id/highlights | JWT | List highlights |
| POST | /books/:id/highlights | JWT | Add highlight |
| PATCH | /books/:id/highlights/:hId | JWT | Update highlight |
| DELETE | /books/:id/highlights/:hId | JWT | Delete highlight |

## Notes (Phase 5)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /books/:id/notes | JWT | List notes |
| POST | /books/:id/notes | JWT | Add note |
| PATCH | /books/:id/notes/:nId | JWT | Update note |
| DELETE | /books/:id/notes/:nId | JWT | Delete note |
