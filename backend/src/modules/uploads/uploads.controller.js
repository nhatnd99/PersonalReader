import { UploadsService } from './uploads.service.js'
import { initiateUploadSchema } from './uploads.validation.js'

export class UploadsController {
  /**
   * Initiate upload session and obtain pre-signed PUT URL.
   */
  static async initiate(req, res, next) {
    try {
      const validatedData = initiateUploadSchema.parse(req.body)
      const userId = req.user.sub || req.user.id

      const result = await UploadsService.initiateUpload({
        userId,
        ...validatedData,
      })

      res.status(201).json(result)
    } catch (err) {
      if (err.name === 'ZodError') {
        return res.status(400).json({
          error: 'Validation failed',
          details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        })
      }
      next(err)
    }
  }

  /**
   * Complete upload session and verify R2 storage.
   */
  static async complete(req, res, next) {
    try {
      const { uploadId } = req.params
      const userId = req.user.sub || req.user.id

      const result = await UploadsService.completeUpload({
        uploadId,
        userId,
      })

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  /**
   * Get upload session status.
   */
  static async getStatus(req, res, next) {
    try {
      const { uploadId } = req.params
      const userId = req.user.sub || req.user.id

      const session = await UploadsService.getUploadSession({
        uploadId,
        userId,
      })

      res.status(200).json({ session })
    } catch (err) {
      next(err)
    }
  }

  /**
   * Refresh pre-signed URL for an active upload session.
   */
  static async refreshUrl(req, res, next) {
    try {
      const { uploadId } = req.params
      const userId = req.user.sub || req.user.id

      const result = await UploadsService.refreshUploadUrl({
        uploadId,
        userId,
      })

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  /**
   * Cancel upload session and clean up R2 storage.
   */
  static async cancel(req, res, next) {
    try {
      const { uploadId } = req.params
      const userId = req.user.sub || req.user.id

      const result = await UploadsService.cancelUpload({
        uploadId,
        userId,
      })

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }
}
