import { z } from 'zod'
import { anchorDataSchema } from '../annotations/annotations.validation.js'

export const lookupVocabularySchema = z.object({
  word: z.string().trim().min(1, 'Word or phrase is required').max(200),
  sentence: z.string().trim().max(2000).optional().nullable(),
  previousSentence: z.string().trim().max(1000).optional().nullable(),
  nextSentence: z.string().trim().max(1000).optional().nullable(),
  chapterTitle: z.string().trim().max(255).optional().nullable(),
  surroundingParagraph: z.string().trim().max(4000).optional().nullable(),
  bookId: z.string().uuid().optional().nullable(),
})

export const listVocabularyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  bookId: z.string().uuid().optional(),
  chapterTitle: z.string().trim().optional(),
  sort: z.enum(['newest', 'oldest', 'word']).default('newest'),
})

export const createVocabularySchema = z.object({
  bookId: z.string().uuid().optional().nullable(),
  tocEntryId: z.string().uuid().optional().nullable(),
  chapterTitle: z.string().trim().max(255).optional().nullable(),
  word: z.string().trim().min(1, 'Word is required').max(200),
  partOfSpeech: z.string().trim().max(60).optional().nullable(),
  meaning: z.string().trim().min(1, 'Meaning is required').max(2000),
  contextualMeaning: z.string().trim().max(2000).optional().nullable(),
  exampleSentence: z.string().trim().max(2000).optional().nullable(),
  anchorData: anchorDataSchema.optional().nullable(),
  pronunciation: z.string().trim().max(120).optional().nullable(),
  personalNote: z.string().trim().max(2000).optional().nullable(),
})

export const updateVocabularySchema = z.object({
  partOfSpeech: z.string().trim().max(60).optional().nullable(),
  meaning: z.string().trim().min(1, 'Meaning cannot be empty').max(2000).optional(),
  contextualMeaning: z.string().trim().max(2000).optional().nullable(),
  exampleSentence: z.string().trim().max(2000).optional().nullable(),
  pronunciation: z.string().trim().max(120).optional().nullable(),
  personalNote: z.string().trim().max(2000).optional().nullable(),
})
