import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import '../styles/auth.css'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [clientErrors, setClientErrors] = useState({})

  const validate = () => {
    const errors = {}

    if (!displayName.trim() || displayName.trim().length < 2) {
      errors.displayName = 'Display name must be at least 2 characters'
    }

    if (!email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address'
    }

    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Password must contain at least one uppercase letter'
    } else if (!/[a-z]/.test(password)) {
      errors.password = 'Password must contain at least one lowercase letter'
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Password must contain at least one number'
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    setClientErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!validate()) return

    setLoading(true)
    const result = await register(email.trim(), password, displayName.trim())
    setLoading(false)

    if (result.success) {
      navigate('/', { replace: true })
    } else {
      setErrorMsg(result.error)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <header className="auth-header">
          <h1 className="auth-title">📚 ReadFlow</h1>
          <p className="auth-subtitle">Create your personal account</p>
        </header>

        {errorMsg && (
          <div className="auth-alert-error" role="alert">
            {errorMsg}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="register-name">
              Full Name
            </label>
            <input
              id="register-name"
              type="text"
              className={`form-input ${clientErrors.displayName ? 'has-error' : ''}`}
              placeholder="Alex Johnson"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
              autoComplete="name"
            />
            {clientErrors.displayName && (
              <span className="form-error-text">{clientErrors.displayName}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">
              Email Address
            </label>
            <input
              id="register-email"
              type="email"
              className={`form-input ${clientErrors.email ? 'has-error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
            />
            {clientErrors.email && <span className="form-error-text">{clientErrors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-password">
              Password
            </label>
            <div className="input-wrapper">
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${clientErrors.password ? 'has-error' : ''}`}
                placeholder="At least 8 chars, 1 uppercase, 1 number"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {clientErrors.password && (
              <span className="form-error-text">{clientErrors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-confirm-password">
              Confirm Password
            </label>
            <input
              id="register-confirm-password"
              type={showPassword ? 'text' : 'password'}
              className={`form-input ${clientErrors.confirmPassword ? 'has-error' : ''}`}
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
            />
            {clientErrors.confirmPassword && (
              <span className="form-error-text">{clientErrors.confirmPassword}</span>
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <footer className="auth-footer">
          Already have an account?
          <Link to="/login">Sign in</Link>
        </footer>
      </div>
    </div>
  )
}
