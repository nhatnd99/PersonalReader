/**
 * Vocabulary Lookup & Collection Service.
 */
import prisma from '../../config/database.js'
import { getTranslationProvider, fetchEnglishPronunciation } from '../../services/translation/translationProvider.js'
import { RealtimeSyncService } from '../../services/sync/realtimeSync.service.js'

export class VocabularyService {
  static async lookupContextual(payload) {
    const provider = getTranslationProvider()
    const [translation, fallbackPronunciation] = await Promise.all([
      provider.lookup(payload),
      fetchEnglishPronunciation(payload.word),
    ])

    return {
      ...translation,
      pronunciation: translation.pronunciation || fallbackPronunciation || null,
    }
  }

  static async listEntries({ userId, page = 1, limit = 20, search, bookId, chapterTitle, sort = 'newest' }) {
    const skip = (page - 1) * limit
    const where = { userId }

    if (bookId) where.bookId = bookId
    if (chapterTitle) {
      where.chapterTitle = { contains: chapterTitle, mode: 'insensitive' }
    }
    if (search && search.trim()) {
      const term = search.trim()
      where.OR = [
        { word: { contains: term, mode: 'insensitive' } },
        { meaning: { contains: term, mode: 'insensitive' } },
        { contextualMeaning: { contains: term, mode: 'insensitive' } },
      ]
    }

    let orderBy = { createdAt: 'desc' }
    if (sort === 'oldest') orderBy = { createdAt: 'asc' }
    if (sort === 'word') orderBy = { normalizedWord: 'asc' }

    const [total, entries] = await Promise.all([
      prisma.vocabularyEntry.count({ where }),
      prisma.vocabularyEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          book: {
            select: { id: true, title: true },
          },
        },
      }),
    ])

    return {
      entries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }

  static async getEntryById({ entryId, userId }) {
    const entry = await prisma.vocabularyEntry.findUnique({
      where: { id: entryId },
      include: { book: { select: { id: true, title: true } } },
    })
    if (!entry) {
      const err = new Error('Vocabulary entry not found')
      err.status = 404
      throw err
    }
    if (entry.userId !== userId) {
      const err = new Error('Access denied: You do not own this vocabulary entry')
      err.status = 403
      throw err
    }
    return entry
  }

  static async createEntry({
    userId,
    bookId,
    tocEntryId,
    chapterTitle,
    word,
    partOfSpeech,
    meaning,
    contextualMeaning,
    exampleSentence,
    anchorData,
    pronunciation,
    personalNote,
  }) {
    if (bookId) {
      const book = await prisma.book.findUnique({ where: { id: bookId } })
      if (!book || book.deletedAt !== null) {
        const err = new Error('Book not found')
        err.status = 404
        throw err
      }
      if (book.userId !== userId) {
        const err = new Error('Access denied: You do not own this book')
        err.status = 403
        throw err
      }
    }

    const normalizedWord = word.trim().toLowerCase()

    const existing = await prisma.vocabularyEntry.findFirst({
      where: {
        userId,
        bookId: bookId || null,
        normalizedWord,
      },
    })

    if (existing) {
      const err = new Error(`"${word.trim()}" is already saved in your vocabulary for this book.`)
      err.status = 409
      err.code = 'DUPLICATE_VOCABULARY'
      throw err
    }

    const entry = await prisma.vocabularyEntry.create({
      data: {
        userId,
        bookId: bookId || null,
        tocEntryId: tocEntryId || null,
        chapterTitle: chapterTitle || null,
        word: word.trim(),
        normalizedWord,
        partOfSpeech: partOfSpeech || null,
        meaning,
        contextualMeaning: contextualMeaning || null,
        exampleSentence: exampleSentence || null,
        anchorData: anchorData || null,
        pronunciation: pronunciation || null,
        personalNote: personalNote || null,
      },
      include: { book: { select: { id: true, title: true } } },
    })

    if (bookId) {
      await RealtimeSyncService.publishBookSyncEvent({
        userId,
        bookId,
        eventName: 'vocabulary:updated',
        payload: { action: 'created', entry },
      })
    }

    return { entry }
  }

  static async updateEntry({ entryId, userId, ...data }) {
    const existing = await this.getEntryById({ entryId, userId })

    const updateData = {}
    for (const key of ['partOfSpeech', 'meaning', 'contextualMeaning', 'exampleSentence', 'pronunciation', 'personalNote']) {
      if (data[key] !== undefined) updateData[key] = data[key]
    }

    const entry = await prisma.vocabularyEntry.update({
      where: { id: entryId },
      data: updateData,
      include: { book: { select: { id: true, title: true } } },
    })

    if (existing.bookId) {
      await RealtimeSyncService.publishBookSyncEvent({
        userId,
        bookId: existing.bookId,
        eventName: 'vocabulary:updated',
        payload: { action: 'updated', entry },
      })
    }

    return { entry }
  }

  static async deleteEntry({ entryId, userId }) {
    const existing = await this.getEntryById({ entryId, userId })

    await prisma.vocabularyEntry.delete({ where: { id: entryId } })

    if (existing.bookId) {
      await RealtimeSyncService.publishBookSyncEvent({
        userId,
        bookId: existing.bookId,
        eventName: 'vocabulary:updated',
        payload: { action: 'deleted', entry: { id: entryId } },
      })
    }

    return { message: 'Vocabulary entry deleted' }
  }
}
