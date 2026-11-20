import { describe, it, expect, vi, beforeEach } from 'vitest'

// In-memory localStorage mock for node test runner environment
const createLocalStorageMock = () => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = String(value)
    },
    removeItem: (key) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
}

globalThis.localStorage = createLocalStorageMock()

describe('Frontend Authentication Logic & Form Validation', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('validates email format correctly', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    expect(emailRegex.test('invalid')).toBe(false)
    expect(emailRegex.test('user@example')).toBe(false)
    expect(emailRegex.test('user@example.com')).toBe(true)
    expect(emailRegex.test('reader+test@flow.dev')).toBe(true)
  })

  it('validates password strength rules', () => {
    const isStrongPassword = (pwd) => {
      if (!pwd || pwd.length < 8) return false
      if (!/[A-Z]/.test(pwd)) return false
      if (!/[a-z]/.test(pwd)) return false
      if (!/[0-9]/.test(pwd)) return false
      return true
    }

    expect(isStrongPassword('short')).toBe(false)
    expect(isStrongPassword('alllowercase1')).toBe(false)
    expect(isStrongPassword('ALLUPPERCASE1')).toBe(false)
    expect(isStrongPassword('NoNumberUpper')).toBe(false)
    expect(isStrongPassword('ValidPass123')).toBe(true)
  })

  it('stores and clears access & refresh tokens in localStorage correctly', () => {
    localStorage.setItem('rf_access_token', 'test_access_token')
    localStorage.setItem('rf_refresh_token', 'test_refresh_token')

    expect(localStorage.getItem('rf_access_token')).toBe('test_access_token')
    expect(localStorage.getItem('rf_refresh_token')).toBe('test_refresh_token')

    // Simulate logout cleanup
    localStorage.removeItem('rf_access_token')
    localStorage.removeItem('rf_refresh_token')

    expect(localStorage.getItem('rf_access_token')).toBeNull()
    expect(localStorage.getItem('rf_refresh_token')).toBeNull()
  })

  it('handles API error response parsing', () => {
    const sampleErrorResponse = {
      response: {
        status: 400,
        data: {
          error: 'Validation failed',
          details: [
            { field: 'email', message: 'Invalid email address' },
            { field: 'password', message: 'Password must be at least 8 characters' },
          ],
        },
      },
    }

    const messages = sampleErrorResponse.response.data.details.map((d) => d.message).join('. ')
    expect(messages).toBe('Invalid email address. Password must be at least 8 characters')
  })
})
