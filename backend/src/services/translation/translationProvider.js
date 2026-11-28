/**
 * Contextual English-to-Vietnamese Translation & Dictionary Provider Abstraction.
 * Uses Gemini API Free Tier (@google/generative-ai) when GEMINI_API_KEY is configured.
 * Never fabricates dictionary results when credentials are missing.
 */
import { GoogleGenerativeAI } from '@google/generative-ai'

const TRANSLATION_TIMEOUT_MS = parseInt(process.env.TRANSLATION_TIMEOUT_MS || '12000', 10)

let customProvider = null

export function setTranslationProvider(provider) {
  customProvider = provider
}

/**
 * Optional free English pronunciation lookup (dictionaryapi.dev).
 * Fails softly so it never blocks contextual translation.
 */
export async function fetchEnglishPronunciation(word) {
  const clean = String(word || '').trim()
  if (!clean || clean.includes(' ') || clean.length > 45) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3000)

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean.toLowerCase())}`,
      { signal: controller.signal }
    )
    if (!res.ok) return null
    const data = await res.json()
    const entry = Array.isArray(data) ? data[0] : null
    if (!entry) return null

    const phoneticText =
      entry.phonetic ||
      entry.phonetics?.find((p) => p.text)?.text ||
      null
    return phoneticText
  } catch (_) {
    return null
  } finally {
    clearTimeout(timer)
  }
}

class GeminiTranslationProvider {
  async lookup({ word, sentence, previousSentence, nextSentence, chapterTitle, surroundingParagraph }) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'your-gemini-api-key') {
      const err = new Error(
        'Contextual translation provider is not configured. Please set GEMINI_API_KEY on the backend.'
      )
      err.status = 503
      err.code = 'TRANSLATION_PROVIDER_UNCONFIGURED'
      throw err
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    })

    const prompt = [
      'You are an expert English-to-Vietnamese literary & academic translator.',
      'Analyze the target English word or phrase strictly within its book context and return ONLY a JSON object with these keys:',
      '- "partOfSpeech": string (e.g. "noun", "verb", "phrasal verb", "idiom", "adjective")',
      '- "vietnameseMeaning": string (concise Vietnamese meaning matching THIS context)',
      '- "contextualMeaning": string (1-2 sentence Vietnamese explanation of how it is used in this exact sentence)',
      '- "generalMeaning": string (brief common Vietnamese meaning(s) for comparison)',
      '- "pronunciation": string (IPA pronunciation if applicable, else "")',
      '',
      `Target word/phrase: "${word}"`,
      chapterTitle ? `Chapter: "${chapterTitle}"` : '',
      previousSentence ? `Previous sentence: "${previousSentence}"` : '',
      sentence ? `Sentence containing selection: "${sentence}"` : '',
      nextSentence ? `Next sentence: "${nextSentence}"` : '',
      surroundingParagraph ? `Surrounding paragraph: "${surroundingParagraph}"` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const timeoutPromise = new Promise((_, reject) => {
      const t = setTimeout(() => {
        const err = new Error('Translation provider timed out. Please try again.')
        err.status = 504
        err.code = 'TRANSLATION_TIMEOUT'
        reject(err)
      }, TRANSLATION_TIMEOUT_MS)
      if (typeof t.unref === 'function') t.unref()
    })

    try {
      const result = await Promise.race([model.generateContent(prompt), timeoutPromise])
      const rawText = result.response.text()
      const parsed = JSON.parse(rawText)

      return {
        word,
        partOfSpeech: parsed.partOfSpeech || null,
        vietnameseMeaning: parsed.vietnameseMeaning || '',
        contextualMeaning: parsed.contextualMeaning || '',
        generalMeaning: parsed.generalMeaning || null,
        pronunciation: parsed.pronunciation || null,
        exampleSentence: sentence || surroundingParagraph || null,
        provider: 'gemini',
      }
    } catch (err) {
      if (err.code === 'TRANSLATION_TIMEOUT') throw err
      if (err.status === 429 || String(err.message).includes('429')) {
        const rateErr = new Error('Translation free-tier rate limit reached. Please wait a moment and try again.')
        rateErr.status = 429
        rateErr.code = 'TRANSLATION_RATE_LIMITED'
        throw rateErr
      }
      const providerErr = new Error('Failed to retrieve contextual translation from provider.')
      providerErr.status = 502
      providerErr.code = 'TRANSLATION_PROVIDER_ERROR'
      throw providerErr
    }
  }
}

const defaultGeminiProvider = new GeminiTranslationProvider()

export function getTranslationProvider() {
  return customProvider || defaultGeminiProvider
}
