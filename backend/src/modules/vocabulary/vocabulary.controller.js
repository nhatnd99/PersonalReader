import { VocabularyService } from './vocabulary.service.js'
import {
  lookupVocabularySchema,
  listVocabularyQuerySchema,
  createVocabularySchema,
  updateVocabularySchema,
} from './vocabulary.validation.js'

function handleError(err, res, next) {
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    })
  }
  if (err.code) {
    return res.status(err.status || 400).json({ error: err.message, code: err.code })
  }
  return next(err)
}

export class VocabularyController {
  static async lookup(req, res, next) {
    try {
      const data = lookupVocabularySchema.parse(req.body)
      const result = await VocabularyService.lookupContextual(data)
      res.status(200).json({ lookup: result })
    } catch (err) {
      handleError(err, res, next)
    }
  }

  static async list(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const query = listVocabularyQuerySchema.parse(req.query)
      const result = await VocabularyService.listEntries({ userId, ...query })
      res.status(200).json(result)
    } catch (err) {
      handleError(err, res, next)
    }
  }

  static async getById(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const entry = await VocabularyService.getEntryById({ entryId: req.params.entryId, userId })
      res.status(200).json({ entry })
    } catch (err) {
      handleError(err, res, next)
    }
  }

  static async create(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const data = createVocabularySchema.parse(req.body)
      const result = await VocabularyService.createEntry({ userId, ...data })
      res.status(201).json(result)
    } catch (err) {
      handleError(err, res, next)
    }
  }

  static async update(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const data = updateVocabularySchema.parse(req.body)
      const result = await VocabularyService.updateEntry({ entryId: req.params.entryId, userId, ...data })
      res.status(200).json(result)
    } catch (err) {
      handleError(err, res, next)
    }
  }

  static async delete(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id
      const result = await VocabularyService.deleteEntry({ entryId: req.params.entryId, userId })
      res.status(200).json(result)
    } catch (err) {
      handleError(err, res, next)
    }
  }
}
