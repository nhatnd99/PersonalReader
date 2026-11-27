import { z } from 'zod'

export const createTocEntrySchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  parentId: z.string().uuid().optional().nullable(),
  contentSequence: z.coerce.number().int().positive().default(1),
  contentBlockId: z.string().max(100).optional().nullable(),
  level: z.coerce.number().int().min(1).max(4).default(1),
})

export const updateTocEntrySchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200).optional(),
  parentId: z.string().uuid().optional().nullable(),
  contentSequence: z.coerce.number().int().positive().optional(),
  contentBlockId: z.string().max(100).optional().nullable(),
  level: z.coerce.number().int().min(1).max(4).optional(),
})

export const reorderTocSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        parentId: z.string().uuid().optional().nullable(),
        position: z.coerce.number().int().min(0),
        level: z.coerce.number().int().min(1).max(4).optional(),
      })
    )
    .min(1, 'At least one TOC item is required'),
})

export const upsertProgressSchema = z.object({
  currentTocEntryId: z.string().uuid().optional().nullable(),
  currentBlockId: z.string().max(120).optional().nullable(),
  currentSequence: z.coerce.number().int().positive().default(1),
  scrollPercentage: z.coerce.number().min(0).max(100).default(0),
  readingPercentage: z.coerce.number().min(0).max(100).default(0),
  deviceId: z.string().max(120).optional().nullable(),
  clientRevision: z.coerce.number().int().positive().optional(),
})

export const upsertPreferencesSchema = z.object({
  fontSize: z.coerce.number().int().min(12).max(32).optional(),
  fontFamily: z.enum(['serif', 'sans', 'mono']).optional(),
  lineHeight: z.coerce.number().min(1.2).max(2.4).optional(),
  contentWidth: z.coerce.number().int().min(480).max(1000).optional(),
  theme: z.enum(['light', 'dark', 'sepia']).optional(),
})
