import axios from 'axios'
import api from '../../../services/api.js'

// Standalone Axios instance without Authorization or credentials headers for direct Cloudflare R2 uploads
const r2Client = axios.create()

export const UploadService = {
  /**
   * 1. Initiate upload session and obtain pre-signed PUT URL from backend.
   */
  async initiate({ fileName, fileSize, mimeType, title, author, description }) {
    const { data } = await api.post('/api/v1/uploads/initiate', {
      fileName,
      fileSize,
      mimeType: mimeType || 'application/pdf',
      title,
      author,
      description,
    })
    return data
  },

  /**
   * 2. Upload PDF file directly from the browser to Cloudflare R2 with progress tracking.
   * Vercel Serverless Functions never touch the file bytes.
   */
  async uploadToR2(uploadUrl, file, onProgress, cancelSignal) {
    const response = await r2Client.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type || 'application/pdf',
      },
      signal: cancelSignal,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          if (onProgress) onProgress(percent, progressEvent.loaded, progressEvent.total)
        }
      },
    })
    return response
  },

  /**
   * 3. Notify backend that direct upload completed so backend can verify R2 object and activate book.
   */
  async complete(uploadId) {
    const { data } = await api.post(`/api/v1/uploads/${uploadId}/complete`)
    return data
  },

  /**
   * Cancel an in-progress upload session.
   */
  async cancel(uploadId) {
    try {
      const { data } = await api.post(`/api/v1/uploads/${uploadId}/cancel`)
      return data
    } catch (_) {
      // Ignore cancellation network errors
      return null
    }
  },

  /**
   * Refresh expired pre-signed URL.
   */
  async refreshUrl(uploadId) {
    const { data } = await api.post(`/api/v1/uploads/${uploadId}/refresh-url`)
    return data
  },
}
