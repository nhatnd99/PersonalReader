/**
 * Account-level Reading Preferences Service.
 */
import prisma from '../../config/database.js'

const DEFAULT_PREFS = {
  fontSize: 18,
  fontFamily: 'serif',
  lineHeight: 1.75,
  contentWidth: 720,
  theme: 'light',
}

export class PreferencesService {
  static async getPreferences(userId) {
    const prefs = await prisma.readingPreference.findUnique({
      where: { userId },
    })
    return prefs || { userId, ...DEFAULT_PREFS }
  }

  static async upsertPreferences(userId, data) {
    const clean = {
      fontSize: data.fontSize !== undefined ? Math.min(32, Math.max(12, parseInt(data.fontSize, 10) || 18)) : DEFAULT_PREFS.fontSize,
      fontFamily: ['serif', 'sans', 'mono'].includes(data.fontFamily) ? data.fontFamily : DEFAULT_PREFS.fontFamily,
      lineHeight: data.lineHeight !== undefined ? Math.min(2.4, Math.max(1.2, Number(data.lineHeight) || 1.75)) : DEFAULT_PREFS.lineHeight,
      contentWidth: data.contentWidth !== undefined ? Math.min(1000, Math.max(480, parseInt(data.contentWidth, 10) || 720)) : DEFAULT_PREFS.contentWidth,
      theme: ['light', 'dark', 'sepia'].includes(data.theme) ? data.theme : DEFAULT_PREFS.theme,
    }

    return prisma.readingPreference.upsert({
      where: { userId },
      create: { userId, ...clean },
      update: clean,
    })
  }
}
