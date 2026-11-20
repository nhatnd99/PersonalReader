# Cloudflare R2 Setup Guide

## 1. Create an R2 Bucket

1. Log in to the Cloudflare dashboard
2. Navigate to **R2 Object Storage**
3. Create a bucket named `readflow-pdfs`
4. Keep the bucket **private** (no public access)

## 2. Create API Tokens

1. Go to **R2 → Manage R2 API Tokens**
2. Create a token with:
   - Permissions: **Object Read & Write**
   - Bucket: `readflow-pdfs` only (not all buckets)
3. Save the **Access Key ID** and **Secret Access Key**

## 3. Configure CORS on the Bucket

Add a CORS policy to the bucket to allow direct PUT uploads from the frontend:

```json
[
  {
    "AllowedOrigins": ["https://your-frontend.vercel.app", "http://localhost:5173"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

**Important:** Replace with your actual frontend origin. Never use `*` for private buckets.

## 4. Environment Variables

| Variable | Value |
|----------|-------|
| `R2_ACCOUNT_ID` | Your Cloudflare Account ID (from dashboard URL) |
| `R2_ACCESS_KEY_ID` | From the R2 API token |
| `R2_SECRET_ACCESS_KEY` | From the R2 API token |
| `R2_BUCKET_NAME` | `readflow-pdfs` |
| `R2_PUBLIC_URL` | Custom domain or R2.dev subdomain (for pre-signed GETs) |

## 5. File Size and Quota

- Max PDF size: configurable via `MAX_PDF_SIZE_BYTES` (default 50 MB)
- R2 free: 10 GB total storage
- Monitor storage use in the Cloudflare R2 dashboard
- Pre-signed PUT URLs expire after 15 minutes
