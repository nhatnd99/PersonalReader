import { z } from 'zod'

export const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'pink', 'purple']

export const anchorDataSchema = z.object({
  contentSequence: z.coerce.number().int().positive().default(1),
  startBlockId: z.string().min(1).max(120),
  endBlockId: z.string().min(1).max(120).optional(),
  startOffset: z.coerce.number().int().min(0).default(0),
  endOffset: z.coerce.number().int().min(0).default(0),
  selectedText: z.string().max(4000).optional(),
  prefixContext: z.string().max(120).optional().default(''),
  suffixContext: z.string().max(120).optional().default(''),
})

export const createHighlightSchema = z.object({
  tocEntryId: z.string().uuid().optional().nullable(),
  selectedText: z.string().trim().min(1, 'Selected text is required').max(4000),
  anchorData: anchorDataSchema,
  color: z.enum(HIGHLIGHT_COLORS).default('yellow'),
})

export const updateHighlightSchema = z.object({
  color: z.enum(HIGHLIGHT_COLORS),
})

export const createBookmarkSchema = z.object({
  tocEntryId: z.string().uuid().optional().nullable(),
  chapterTitle: z.string().trim().max(255).optional().nullable(),
  anchorData: anchorDataSchema,
  selectedText: z.string().trim().max(1000).optional().nullable(),
  title: z.string().trim().min(1, 'Bookmark title is required').max(200),
  description: z.string().trim().max(1000).optional().nullable(),
})

export const updateBookmarkSchema = z.object({
  title: z.string().trim().min(1, 'Bookmark title is required').max(200).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
})

export const createNoteSchema = z.object({
  tocEntryId: z.string().uuid().optional().nullable(),
  chapterTitle: z.string().trim().max(255).optional().nullable(),
  anchorData: anchorDataSchema.optional().nullable(),
  selectedText: z.string().trim().max(2000).optional().nullable(),
  title: z.string().trim().min(1, 'Note title is required').max(200),
  content: z.string().trim().min(1, 'Note content is required').max(10000),
})

export const updateNoteSchema = z.object({
  title: z.string().trim().min(1, 'Note title is required').max(200).optional(),
  content: z.string().trim().min(1, 'Note content is required').max(10000).optional(),
})
