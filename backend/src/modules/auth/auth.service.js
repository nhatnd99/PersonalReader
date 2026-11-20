import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../../config/database.js'

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'rf_default_dev_secret_32_chars_min!'
const ACCESS_TOKEN_EXPIRES_IN = '15m'
const REFRESH_TOKEN_EXPIRY_DAYS = 7

/**
 * Hash raw token for secure database storage.
 */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

/**
 * Generate secure random token string.
 */
function generateRawToken() {
  return crypto.randomBytes(40).toString('hex')
}

export class AuthService {
  /**
   * Register a new user.
   */
  static async register({ email, password, displayName }) {
    const normalizedEmail = email.trim().toLowerCase()

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      const error = new Error('An account with this email already exists')
      error.status = 409
      throw error
    }

    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        displayName: displayName.trim(),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return user
  }

  /**
   * Authenticate user with credentials.
   */
  static async login({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    // Generic error message to prevent user enumeration
    if (!user || !user.isActive) {
      const error = new Error('Invalid email or password')
      error.status = 401
      throw error
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      const error = new Error('Invalid email or password')
      error.status = 401
      throw error
    }

    const tokens = await this.issueTokens(user.id)

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      ...tokens,
    }
  }

  /**
   * Issue new Access Token and Refresh Token (with new family).
   */
  static async issueTokens(userId, existingFamily = null) {
    const accessToken = jwt.sign(
      { sub: userId, type: 'access' },
      ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    )

    const rawRefreshToken = generateRawToken()
    const tokenHash = hashToken(rawRefreshToken)
    const family = existingFamily || crypto.randomUUID()
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        family,
        expiresAt,
      },
    })

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    }
  }

  /**
   * Rotate Refresh Token. Detect reuse of revoked tokens.
   */
  static async refresh(rawRefreshToken) {
    if (!rawRefreshToken) {
      const error = new Error('Refresh token is required')
      error.status = 401
      throw error
    }

    const tokenHash = hashToken(rawRefreshToken)

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })

    if (!storedToken) {
      const error = new Error('Invalid or expired refresh token')
      error.status = 401
      throw error
    }

    // Reuse detection: If token is already revoked, compromise detected! Revoke entire token family!
    if (storedToken.isRevoked) {
      await prisma.refreshToken.updateMany({
        where: { family: storedToken.family },
        data: { isRevoked: true },
      })
      const error = new Error('Invalid refresh token session. Please login again.')
      error.status = 401
      throw error
    }

    // Check expiration
    if (new Date() > storedToken.expiresAt) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      })
      const error = new Error('Refresh token expired')
      error.status = 401
      throw error
    }

    // Check user active
    if (!storedToken.user || !storedToken.user.isActive) {
      const error = new Error('User account is inactive')
      error.status = 403
      throw error
    }

    // Revoke the current token upon use (single-use rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    })

    // Issue new pair continuing the token family
    const tokens = await this.issueTokens(storedToken.userId, storedToken.family)

    return {
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        displayName: storedToken.user.displayName,
        avatarUrl: storedToken.user.avatarUrl,
        isActive: storedToken.user.isActive,
        emailVerified: storedToken.user.emailVerified,
      },
      ...tokens,
    }
  }

  /**
   * Revoke a refresh token session on logout.
   */
  static async logout(rawRefreshToken) {
    if (!rawRefreshToken) return

    const tokenHash = hashToken(rawRefreshToken)
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    })

    if (storedToken) {
      // Revoke the token family
      await prisma.refreshToken.updateMany({
        where: { family: storedToken.family },
        data: { isRevoked: true },
      })
    }
  }

  /**
   * Get safe user profile by ID.
   */
  static async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user || !user.isActive) {
      const error = new Error('User not found')
      error.status = 404
      throw error
    }

    return user
  }
}
