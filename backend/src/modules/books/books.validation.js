import { z } from 'zod'

export const listBooksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  sort: z.enum(['newest', 'oldest', 'updated', 'title']).default('newest'),
})

export const updateBookSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title cannot be empty')
    .max(255, 'Title cannot exceed 255 characters')
    .optional(),
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
  language: z
    .string()
    .trim()
    .max(50, 'Language cannot exceed 50 characters')
    .optional()
    .nullable(),
})
