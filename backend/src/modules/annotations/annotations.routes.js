import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { AnnotationsController } from './annotations.controller.js'

export const highlightsRouter = Router()
highlightsRouter.use(authenticate)
highlightsRouter.patch('/:highlightId', AnnotationsController.updateHighlight)
highlightsRouter.delete('/:highlightId', AnnotationsController.deleteHighlight)

export const bookmarksRouter = Router()
bookmarksRouter.use(authenticate)
bookmarksRouter.patch('/:bookmarkId', AnnotationsController.updateBookmark)
bookmarksRouter.delete('/:bookmarkId', AnnotationsController.deleteBookmark)

export const notesRouter = Router()
notesRouter.use(authenticate)
notesRouter.patch('/:noteId', AnnotationsController.updateNote)
notesRouter.delete('/:noteId', AnnotationsController.deleteNote)
