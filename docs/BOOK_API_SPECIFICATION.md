# ReadFlow Book & Upload API Specification

All endpoints in this specification require an authenticated user session via Bearer JWT token in the `Authorization` header:
```http
Authorization: Bearer <ACCESS_TOKEN>
```

---

## 1. Upload Endpoints (`/api/v1/uploads`)

### 1.1 Initiate Upload Session
Pre-validates file metadata, checks user storage quota, creates pending database records, and generates a pre-signed PUT URL.

- **Method**: `POST`
- **Path**: `/api/v1/uploads/initiate`
- **Rate Limit**: 50 requests per 15 minutes per IP

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer <ACCESS_TOKEN>
```

#### Request Body
```json
{
  "fileName": "atomic_habits.pdf",
  "fileSize": 18450100,
  "mimeType": "application/pdf",
  "title": "Atomic Habits",
  "author": "James Clear",
  "description": "An easy and proven way to build good habits."
}
```

| Field | Type | Required? | Constraints |
|---|---|---|---|
| `fileName` | string | Yes | Must end in `.pdf`. No path traversal characters (`..`, `/`, `\`). Max 255 chars. |
| `fileSize` | number | Yes | Integer > 0 and <= `MAX_PDF_SIZE_BYTES` (50 MB). |
| `mimeType` | string | Yes | Must be `application/pdf` or `application/x-pdf`. |
| `title` | string | Yes | Min 1 char, max 255 chars. |
| `author` | string | No | Max 255 chars. |
| `description` | string | No | Max 1000 chars. |

#### Response `201 Created`
```json
{
  "uploadId": "c3a2f7c0-781d-4813-82f5-30dbd50b4ec1",
  "bookId": "a7b3c2d1-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
  "objectKey": "users/11111111-2222-3333-4444-555555555555/books/a7b3c2d1-4e5f-6a7b-8c9d-0e1f2a3b4c5d/99999999-8888-7777-6666-555555555555.pdf",
  "uploadUrl": "https://<account>.r2.cloudflarestorage.com/readflow-pdfs/users/...?X-Amz-Signature=...",
  "expiresIn": 900,
  "expiresAt": "2026-11-21T18:15:00.000Z",
  "book": {
    "id": "a7b3c2d1-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
    "title": "Atomic Habits",
    "author": "James Clear",
    "status": "pending",
    "createdAt": "2026-11-21T18:00:00.000Z"
  }
}
```

#### Error Responses
- `400 Bad Request`: Validation failure or quota exceeded (`code: "STORAGE_QUOTA_EXCEEDED"`).
- `401 Unauthorized`: Missing or invalid token.

---

### 1.2 Complete Upload Session
Verifies object existence in Cloudflare R2, verifies `%PDF-` file signature, and marks the book as `ready`. **Idempotent.**

- **Method**: `POST`
- **Path**: `/api/v1/uploads/:uploadId/complete`

#### Response `200 OK`
```json
{
  "message": "Upload completed successfully",
  "book": {
    "id": "a7b3c2d1-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
    "userId": "11111111-2222-3333-4444-555555555555",
    "title": "Atomic Habits",
    "author": "James Clear",
    "originalFileName": "atomic_habits.pdf",
    "status": "ready",
    "createdAt": "2026-11-21T18:00:00.000Z",
    "files": [
      {
        "id": "88888888-7777-6666-5555-444444444444",
        "storageProvider": "r2",
        "fileSize": 18450100,
        "mimeType": "application/pdf",
        "uploadStatus": "completed"
      }
    ]
  }
}
```

#### Error Responses
- `400 Bad Request`: `OBJECT_NOT_FOUND`, `INVALID_PDF_SIGNATURE`, or `UPLOAD_SESSION_EXPIRED`.
- `403 Forbidden`: User does not own this session.
- `404 Not Found`: Upload session does not exist.

---

### 1.3 Get Upload Session Status
- **Method**: `GET`
- **Path**: `/api/v1/uploads/:uploadId`

#### Response `200 OK`
```json
{
  "session": {
    "id": "c3a2f7c0-781d-4813-82f5-30dbd50b4ec1",
    "status": "pending",
    "expectedFileSize": 18450100,
    "expiresAt": "2026-11-21T18:15:00.000Z",
    "book": {
      "id": "a7b3c2d1-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
      "title": "Atomic Habits"
    }
  }
}
```

---

### 1.4 Refresh Pre-Signed Upload URL
- **Method**: `POST`
- **Path**: `/api/v1/uploads/:uploadId/refresh-url`

#### Response `200 OK`
```json
{
  "uploadId": "c3a2f7c0-781d-4813-82f5-30dbd50b4ec1",
  "uploadUrl": "https://<account>.r2.cloudflarestorage.com/...",
  "expiresIn": 900,
  "expiresAt": "2026-11-21T18:30:00.000Z"
}
```

---

### 1.5 Cancel Upload Session
- **Method**: `POST`
- **Path**: `/api/v1/uploads/:uploadId/cancel`

#### Response `200 OK`
```json
{
  "message": "Upload session cancelled and cleaned up successfully"
}
```

---

## 2. Book Management Endpoints (`/api/v1/books`)

### 2.1 List Books
Retrieves paginated collection of books belonging to the authenticated user.

- **Method**: `GET`
- **Path**: `/api/v1/books`
- **Query Parameters**:
  - `page`: number (default: `1`)
  - `limit`: number (default: `20`, max: `100`)
  - `search`: string (case-insensitive substring match against `title`, `author`, `originalFileName`)
  - `sort`: `'newest'` | `'oldest'` | `'title'` (default: `'newest'`)

#### Response `200 OK`
```json
{
  "books": [
    {
      "id": "a7b3c2d1-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
      "title": "Atomic Habits",
      "author": "James Clear",
      "originalFileName": "atomic_habits.pdf",
      "status": "ready",
      "createdAt": "2026-11-21T18:00:00.000Z",
      "files": [
        {
          "id": "88888888-7777-6666-5555-444444444444",
          "fileSize": 18450100,
          "mimeType": "application/pdf",
          "uploadStatus": "completed"
        }
      ]
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 2.2 Get Book Details
- **Method**: `GET`
- **Path**: `/api/v1/books/:bookId`

#### Response `200 OK`
```json
{
  "book": {
    "id": "a7b3c2d1-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
    "userId": "11111111-2222-3333-4444-555555555555",
    "title": "Atomic Habits",
    "author": "James Clear",
    "description": "An easy and proven way to build good habits.",
    "originalFileName": "atomic_habits.pdf",
    "status": "ready",
    "createdAt": "2026-11-21T18:00:00.000Z",
    "files": [...]
  }
}
```

#### Error Responses
- `403 Forbidden`: Book belongs to another user.
- `404 Not Found`: Book does not exist or was deleted.

---

### 2.3 Update Book Metadata
- **Method**: `PATCH`
- **Path**: `/api/v1/books/:bookId`

#### Request Body
```json
{
  "title": "Atomic Habits (Expanded Edition)",
  "author": "James Clear",
  "description": "Updated notes"
}
```

#### Response `200 OK`
```json
{
  "message": "Book updated successfully",
  "book": {
    "id": "a7b3c2d1-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
    "title": "Atomic Habits (Expanded Edition)",
    "author": "James Clear",
    "description": "Updated notes"
  }
}
```

---

### 2.4 Delete Book
Soft-deletes the book in Neon database and permanently deletes associated files in Cloudflare R2.

- **Method**: `DELETE`
- **Path**: `/api/v1/books/:bookId`

#### Response `200 OK`
```json
{
  "message": "Book deleted successfully"
}
```

---

### 2.5 Get Pre-Signed Download URL
Generates a short-lived signed GET URL (valid for 5 minutes) configured with `Content-Disposition: attachment`.

- **Method**: `GET`
- **Path**: `/api/v1/books/:bookId/download-url`

#### Response `200 OK`
```json
{
  "downloadUrl": "https://<account>.r2.cloudflarestorage.com/readflow-pdfs/users/...?X-Amz-Signature=...",
  "fileName": "atomic_habits.pdf",
  "expiresIn": 300
}
```
