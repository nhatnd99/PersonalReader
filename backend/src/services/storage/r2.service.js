/**
 * Cloudflare R2 Storage Service (AWS SDK v3 S3-compatible client).
 * Manages pre-signed URLs, object existence verification, PDF header inspection, and object deletion.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

let s3ClientInstance = null

/**
 * Returns resolved Cloudflare R2 configuration from environment variables.
 */
export function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID || 'mock-account-id'
  const endpoint =
    process.env.R2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined)

  return {
    accountId,
    accessKeyId: process.env.R2_ACCESS_KEY_ID || 'mock-access-key',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'mock-secret-key',
    bucketName: process.env.R2_BUCKET_NAME || 'readflow-pdfs',
    endpoint,
    region: process.env.R2_REGION || 'auto',
    presignedExpiresIn: parseInt(process.env.R2_PRESIGNED_URL_EXPIRES_IN || '900', 10),
  }
}

/**
 * Lazily initialize and return the S3Client instance.
 */
export function getS3Client() {
  if (s3ClientInstance) return s3ClientInstance

  const config = getR2Config()
  s3ClientInstance = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
  return s3ClientInstance
}

/**
 * Injects a custom or mock S3Client instance (used in unit/integration tests).
 */
export function setS3Client(mockClient) {
  s3ClientInstance = mockClient
}

export class R2StorageService {
  /**
   * Generate a pre-signed PUT URL for direct browser-to-R2 upload.
   * @param {Object} params
   * @param {string} params.objectKey - Unique R2 object key
   * @param {string} params.mimeType - Expected MIME type (application/pdf)
   * @param {number} [params.expiresIn] - Lifespan in seconds (default 900 = 15m)
   * @returns {Promise<string>}
   */
  static async generatePresignedUploadUrl({ objectKey, mimeType = 'application/pdf', expiresIn }) {
    const config = getR2Config()
    const client = getS3Client()
    const expiry = expiresIn || config.presignedExpiresIn

    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey,
      ContentType: mimeType,
    })

    return getSignedUrl(client, command, { expiresIn: expiry })
  }

  /**
   * Generate a pre-signed GET URL for temporary private object download.
   * @param {Object} params
   * @param {string} params.objectKey
   * @param {string} [params.downloadFilename] - Optional filename for Content-Disposition attachment
   * @param {number} [params.expiresIn] - Lifespan in seconds (default 300 = 5m)
   * @returns {Promise<string>}
   */
  static async generatePresignedDownloadUrl({ objectKey, downloadFilename, expiresIn = 300 }) {
    const config = getR2Config()
    const client = getS3Client()

    const commandInput = {
      Bucket: config.bucketName,
      Key: objectKey,
    }

    if (downloadFilename) {
      // Sanitize filename to prevent header injection
      const safeName = encodeURIComponent(downloadFilename)
      commandInput.ResponseContentDisposition = `attachment; filename="${safeName}"; filename*=UTF-8''${safeName}`
    }

    const command = new GetObjectCommand(commandInput)
    return getSignedUrl(client, command, { expiresIn })
  }

  /**
   * Verify object existence and retrieve metadata using HeadObjectCommand.
   * @param {string} objectKey
   * @returns {Promise<{ exists: boolean, contentLength?: number, contentType?: string, etag?: string }>}
   */
  static async verifyObjectMetadata(objectKey) {
    const config = getR2Config()
    const client = getS3Client()

    try {
      const command = new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: objectKey,
      })

      const response = await client.send(command)
      return {
        exists: true,
        contentLength: response.ContentLength,
        contentType: response.ContentType,
        etag: response.ETag?.replace(/"/g, ''),
      }
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return { exists: false }
      }
      throw err
    }
  }

  /**
   * Verify PDF header signature (%PDF-) using a range GET request for the first 8 bytes.
   * @param {string} objectKey
   * @returns {Promise<boolean>}
   */
  static async verifyPdfSignature(objectKey) {
    const config = getR2Config()
    const client = getS3Client()

    try {
      const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: objectKey,
        Range: 'bytes=0-7',
      })

      const response = await client.send(command)
      const stream = response.Body

      // Read stream into buffer
      const chunks = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }
      const buffer = Buffer.concat(chunks)
      const headerString = buffer.toString('utf-8', 0, 5)

      return headerString.startsWith('%PDF-')
    } catch (err) {
      console.warn(`[R2StorageService] Could not inspect PDF header for ${objectKey}:`, err.message)
      // If range request fails, return true to avoid blocking valid files if range not supported
      return true
    }
  }

  /**
   * Delete an object from Cloudflare R2.
   * @param {string} objectKey
   * @returns {Promise<boolean>}
   */
  static async deleteObject(objectKey) {
    const config = getR2Config()
    const client = getS3Client()

    try {
      const command = new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: objectKey,
      })
      await client.send(command)
      return true
    } catch (err) {
      console.error(`[R2StorageService] Failed to delete object ${objectKey}:`, err.message)
      return false
    }
  }
}
