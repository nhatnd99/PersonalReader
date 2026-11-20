# Free Tier Limits

> [!IMPORTANT]
> These limits are based on information available at time of writing.
> Always verify current limits at each provider's official pricing page before deployment.
> Do NOT assume limits are static – providers change them without notice.

## Vercel Hobby (Frontend & Backend)

| Limit | Value |
|-------|-------|
| Bandwidth | 100 GB / month |
| Serverless Function invocations | 100,000 / month |
| Serverless Function execution time | 100 GB-hours / month |
| Function max duration | 10 seconds (Hobby) |
| Build minutes | 6,000 / month |
| Projects | Unlimited |

**What consumes quota:** Every API request consumes one invocation. Long PDF processing would hit the 10s timeout.

**When exceeded:** Vercel returns 402 / pauses functions. App shows "Service temporarily unavailable."

**Reference:** https://vercel.com/pricing

---

## Neon PostgreSQL Free

| Limit | Value |
|-------|-------|
| Storage | 0.5 GB (512 MB) |
| Compute hours | 191.9 compute-hours / month |
| Branches | 10 |
| Projects | 1 |
| Connections | Via PgBouncer pooler |

**What consumes quota:** Every row stored. Compute time while branch is active. Excessive polling keeps compute active.

**When exceeded:** Neon suspends compute (project pauses). App shows DB connection error.

**Application response:** Health endpoint reports `db: error`. All data operations fail gracefully with 503. No silent data loss.

**Reference:** https://neon.tech/pricing

---

## Cloudflare R2 Free Allowance

| Limit | Value |
|-------|-------|
| Storage | 10 GB / month |
| Class A operations (write, list) | 1,000,000 / month |
| Class B operations (read) | 10,000,000 / month |
| Egress (data transfer out) | Free (no egress fees) |

**What consumes quota:** Each PDF stored counts toward 10 GB. Each pre-signed URL generation counts as a Class A op. Each PDF page load is a Class B op.

**When exceeded:** R2 returns 403/429. Upload/download fail. App shows "Storage quota exceeded."

**Application response:** Upload initiation checks estimated storage before creating pre-signed URL. Error shown to user; no automatic paid upgrade.

**Reference:** https://developers.cloudflare.com/r2/pricing/

---

## Gemini API Free Tier

| Limit | Value |
|-------|-------|
| Model | gemini-1.5-flash (free tier) |
| RPM (requests per minute) | 15 |
| RPD (requests per day) | 1,500 |
| TPM (tokens per minute) | 1,000,000 |
| Context window | 1,048,576 tokens |

**What consumes quota:** Each translation request. Sending long context paragraphs increases token count.

**When exceeded:** Gemini returns 429. App shows "Translation quota reached. Please try again later." Selected text is preserved.

**Application response:** Backend catches 429, returns `{ error: 'quota_exceeded', retryAfter: ... }`. Frontend shows non-blocking error. No fallback to paid model.

**Reference:** https://ai.google.dev/pricing

---

## Per-User Application Limits (Configurable)

| Setting | Default | Env Variable |
|---------|---------|--------------|
| Max PDF size | 50 MB | MAX_PDF_SIZE_BYTES |
| Max storage per user | 500 MB | MAX_USER_STORAGE_BYTES |
| Translation requests (future) | Configurable | — |

These limits are enforced server-side and are independent of provider limits.
