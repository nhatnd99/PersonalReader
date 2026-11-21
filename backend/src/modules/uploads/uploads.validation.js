import { z } from 'zod'

const MAX_PDF_SIZE_BYTES = parseInt(process.env.MAX_PDF_SIZE_BYTES || '52428800', 10) // 50MB default

export const initiateUploadSchema = z.object({
  fileName: z
    .string({ required_error: 'fileName is required' })
    .min(1, 'fileName cannot be empty')
    .max(255, 'fileName too long')
    .refine((name) => /\.pdf$/i.test(name), {
      message: 'Only PDF files (.pdf) are supported',
    })
    .refine((name) => !name.includes('..') && !name.includes('/') && !name.includes('\\'), {
      message: 'Filename contains invalid path traversal characters',
    }),
  fileSize: z
    .number({ required_error: 'fileSize is required' })
    .int('fileSize must be an integer')
    .positive('fileSize must be greater than 0')
    .max(MAX_PDF_SIZE_BYTES, `File size exceeds the limit of ${Math.round(MAX_PDF_SIZE_BYTES / (1024 * 1024))}MB`),
  mimeType: z
    .string({ required_error: 'mimeType is required' })
    .refine(
      (mime) => ['application/pdf', 'application/x-pdf', 'binary/octet-stream'].includes(mime.toLowerCase()),
      { message: 'MIME type must be application/pdf' }
    ),
  title: z
    .string({ required_error: 'title is required' })
    .trim()
    .min(1, 'Title cannot be empty')
    .max(255, 'Title cannot exceed 255 characters'),
  author: z
    .string()
    .trim()
    .max(255, 'Author cannot exceed 255 characters')
    .optional()
    .nullable(),
  description: z
    .string()
    .trim()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional()
    .nullable(),
})
