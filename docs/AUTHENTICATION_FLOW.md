# ReadFlow Authentication Architecture & Lifecycle

## 1. Overview

ReadFlow uses a dual-token authentication strategy designed specifically for serverless backends (Vercel Functions) and cross-origin frontend clients:
- **Access Token**: Short-lived JWT (15 minutes). Sent in the `Authorization: Bearer <token>` header. Contains user ID and claims without sensitive data.
- **Refresh Token**: High-entropy cryptographically random string (40 bytes / 80 hex chars) stored hashed (SHA-256) in the database with 7 days expiration.
- **Token Rotation & Reuse Detection**: Refresh tokens are single-use. When refreshed, a new refresh token is issued within the same **token family**. If an already-revoked refresh token is presented, the entire family is revoked immediately to neutralize potential stolen credentials.

## 2. Token Storage & Cross-Origin Strategy

Frontend and backend can be hosted on separate domains in production:
- Frontend: `https://readflow.vercel.app`
- Backend: `https://readflow-api.vercel.app`

### Transport:
1. **HttpOnly Cookie**:
   - Cookie name: `rf_refresh`
   - Path: `/api/v1/auth`
   - Attributes: `HttpOnly`, `SameSite=None`, `Secure=true` in production; `SameSite=Lax`, `Secure=false` in dev.
2. **Body & Header Fallback**:
   - `rf_refresh_token` is also returned in JSON on login/refresh.
   - For browsers blocking third-party cookies across separate domains, Axios automatically attaches `X-Refresh-Token` header and `{ refreshToken }` in body.

## 3. Authentication Flow Diagram

```text
[Client / PWA]                                       [Backend Express / Vercel]             [Neon PostgreSQL]
      │                                                           │                                 │
      │ 1. POST /auth/register (email, pwd, name)                │                                 │
      ├──────────────────────────────────────────────────────────>│ Validate & hash with bcrypt     │
      │                                                           │──> INSERT INTO users ──────────>│
      │<──────────────────────────────────────────────────────────│ 201 Created (safe user object)  │
      │                                                           │                                 │
      │ 2. POST /auth/login (email, pwd)                         │                                 │
      ├──────────────────────────────────────────────────────────>│ Compare hash                    │
      │                                                           │──> INSERT refresh_tokens ──────>│
      │<──────────────────────────────────────────────────────────│ 200 (access_token + rf_refresh) │
      │                                                           │                                 │
      │ 3. GET /protected-resource (Bearer access_token)         │                                 │
      ├──────────────────────────────────────────────────────────>│ Verify JWT signature & expiry  │
      │<──────────────────────────────────────────────────────────│ 200 OK                          │
      │                                                           │                                 │
      │ 4. Access Token Expires (401 TOKEN_EXPIRED)              │                                 │
      │    Axios Interceptor Queues Requests                     │                                 │
      │    POST /auth/refresh (rf_refresh)                       │                                 │
      ├──────────────────────────────────────────────────────────>│ Check hash & family            │
      │                                                           │──> UPDATE is_revoked=true ─────>│
      │                                                           │──> INSERT new refresh_token ───>│
      │<──────────────────────────────────────────────────────────│ 200 (new access + refresh)     │
      │    Retry original queued requests                         │                                 │
      │                                                           │                                 │
      │ 5. POST /auth/logout                                     │                                 │
      ├──────────────────────────────────────────────────────────>│ Revoke family in DB             │
      │<──────────────────────────────────────────────────────────│ 200 OK + Clear cookie           │
```

## 4. Security Highlights

- **Bcrypt**: 12 salt rounds for password hashing.
- **SHA-256**: Raw refresh tokens are never stored plaintext in the database.
- **No Password Leaks**: All Prisma queries use explicit `select` masks to omit `passwordHash`.
- **Brute-Force Protection**: Express rate limiting on `/login` and `/register` (20 attempts per 15 min).
- **Graceful Error Messages**: Generic "Invalid email or password" to prevent user enumeration.
- **Serverless-Safe**: Stateless token verification does not rely on server in-memory sessions.
