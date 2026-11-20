import { AuthService } from './auth.service.js'
import { registerSchema, loginSchema, refreshSchema } from './auth.validation.js'

// Cookie options for Refresh Token
const isProduction = process.env.NODE_ENV === 'production'

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction, // HTTPS in production
  sameSite: isProduction ? 'none' : 'lax', // 'none' needed for cross-domain on Vercel
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
}

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/api/v1/auth',
}

export class AuthController {
  /**
   * Register a new user account.
   */
  static async register(req, res, next) {
    try {
      const validatedData = registerSchema.parse(req.body)
      const user = await AuthService.register(validatedData)

      res.status(201).json({
        message: 'Account created successfully',
        user,
      })
    } catch (err) {
      if (err.name === 'ZodError') {
        return res.status(400).json({
          error: 'Validation failed',
          details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        })
      }
      next(err)
    }
  }

  /**
   * Log in user, issue access token and refresh token.
   */
  static async login(req, res, next) {
    try {
      const validatedData = loginSchema.parse(req.body)
      const result = await AuthService.login(validatedData)

      // Set HttpOnly refresh cookie
      res.cookie('rf_refresh', result.refreshToken, REFRESH_COOKIE_OPTIONS)

      res.status(200).json({
        message: 'Login successful',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken, // Also return in body as fallback for cross-domain setups
        expiresIn: result.expiresIn,
      })
    } catch (err) {
      if (err.name === 'ZodError') {
        return res.status(400).json({
          error: 'Validation failed',
          details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        })
      }
      next(err)
    }
  }

  /**
   * Refresh access token using refresh token rotation.
   */
  static async refresh(req, res, next) {
    try {
      // Check cookie first, fallback to request body or authorization header
      const rawRefreshToken =
        req.cookies?.rf_refresh ||
        req.body?.refreshToken ||
        req.headers['x-refresh-token']

      const result = await AuthService.refresh(rawRefreshToken)

      // Set new rotated refresh cookie
      res.cookie('rf_refresh', result.refreshToken, REFRESH_COOKIE_OPTIONS)

      res.status(200).json({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      })
    } catch (err) {
      // Clear cookie on refresh error
      res.clearCookie('rf_refresh', CLEAR_COOKIE_OPTIONS)
      next(err)
    }
  }

  /**
   * Log out user and revoke refresh session.
   */
  static async logout(req, res, next) {
    try {
      const rawRefreshToken =
        req.cookies?.rf_refresh ||
        req.body?.refreshToken ||
        req.headers['x-refresh-token']

      await AuthService.logout(rawRefreshToken)

      res.clearCookie('rf_refresh', CLEAR_COOKIE_OPTIONS)

      res.status(200).json({ message: 'Logged out successfully' })
    } catch (err) {
      next(err)
    }
  }

  /**
   * Get current authenticated user profile.
   */
  static async me(req, res, next) {
    try {
      const user = await AuthService.getUserById(req.user.sub)
      res.status(200).json({ user })
    } catch (err) {
      next(err)
    }
  }
}
