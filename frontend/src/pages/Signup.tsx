import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/api'
import './Signup.css'

/**
 * Signup page — connected to the backend registration API via the shared
 * auth context. After registering we log the user in and go to the dashboard.
 */

type FieldName = 'username' | 'email' | 'password' | 'confirmPassword'

interface FormState {
  username: string
  email: string
  password: string
  confirmPassword: string
}

type FormErrors = Partial<Record<FieldName, string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FIELD_NAMES: FieldName[] = ['username', 'email', 'password', 'confirmPassword']

function validateField(name: FieldName, form: FormState): string | undefined {
  switch (name) {
    case 'username': {
      const value = form.username.trim()
      if (!value) return 'Username is required.'
      if (value.length < 3) return 'Username must be at least 3 characters.'
      if (value.length > 50) return 'Username must be at most 50 characters.'
      return undefined
    }
    case 'email': {
      const value = form.email.trim()
      if (!value) return 'Email is required.'
      if (!EMAIL_RE.test(value)) return 'Enter a valid email address.'
      return undefined
    }
    case 'password': {
      if (!form.password) return 'Password is required.'
      if (form.password.length < 8) return 'Password must be at least 8 characters.'
      if (form.password.length > 128) return 'Password must be at most 128 characters.'
      return undefined
    }
    case 'confirmPassword': {
      if (!form.confirmPassword) return 'Please confirm your password.'
      if (form.confirmPassword !== form.password) return 'Passwords do not match.'
      return undefined
    }
  }
}

function validateAll(form: FormState): FormErrors {
  const errors: FormErrors = {}
  for (const name of FIELD_NAMES) {
    const msg = validateField(name, form)
    if (msg) errors[name] = msg
  }
  return errors
}

function CheckIcon() {
  return <Check size={15} strokeWidth={2.2} aria-hidden="true" />
}

export default function Signup() {
  const { registerAndLogin } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const setField = (name: FieldName, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      setErrors((prevErrors) => {
        const nextErrors = { ...prevErrors }
        for (const key of FIELD_NAMES) {
          if (!touched[key]) continue
          const msg = validateField(key, next)
          if (msg) nextErrors[key] = msg
          else delete nextErrors[key]
        }
        return nextErrors
      })
      return next
    })
  }

  const handleBlur = (name: FieldName) => {
    setTouched((prev) => ({ ...prev, [name]: true }))
    const msg = validateField(name, form)
    setErrors((prev) => ({ ...prev, [name]: msg }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (submitting) return

    const nextErrors = validateAll(form)
    setErrors(nextErrors)
    setTouched(Object.fromEntries(FIELD_NAMES.map((n) => [n, true])))
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      await registerAndLogin(form.username.trim(), form.email.trim(), form.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.status === 409
            ? err.message
            : err.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setSubmitting(false)
      setForm((prev) => ({ ...prev, password: '', confirmPassword: '' }))
    }
  }

  return (
    <div className="signup-page">
      {/* ---------- Left panel ---------- */}
      <aside className="signup-left">
        <Link to="/" className="signup-back">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>

        <div className="signup-left-body">
          <h2>Chat with your documents using AI</h2>
          <p>
            Upload PDFs, reports, and notes, then ask questions in plain language. Every answer is
            grounded in your own content.
          </p>
          <ul className="signup-perks">
            <li>
              <span className="signup-perk-icon" aria-hidden="true">
                <CheckIcon />
              </span>
              Grounded answers with verifiable citations
            </li>
            <li>
              <span className="signup-perk-icon" aria-hidden="true">
                <CheckIcon />
              </span>
              PDF, DOCX, XLSX and plain-text support
            </li>
            <li>
              <span className="signup-perk-icon" aria-hidden="true">
                <CheckIcon />
              </span>
              Private, authenticated workspaces
            </li>
          </ul>
        </div>
      </aside>

      {/* ---------- Right panel ---------- */}
      <main className="signup-right">
        <div className="signup-card">
          <div className="signup-logo">
            <span className="logo-mark" aria-hidden="true">
              ✦
            </span>
            <span className="logo-text">Notebook AI</span>
          </div>

          <h1>Create your account</h1>
          <p className="signup-subtitle">Start chatting with your documents in minutes.</p>

          {submitError && (
            <div className="form-banner form-banner-error" role="alert">
              {submitError}
            </div>
          )}

          <form className="signup-form" onSubmit={handleSubmit} noValidate>
            <div className="form-field">
              <label htmlFor="signup-username">Username</label>
              <input
                id="signup-username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="jane-doe"
                value={form.username}
                onChange={(e) => setField('username', e.target.value)}
                onBlur={() => handleBlur('username')}
                aria-invalid={Boolean(errors.username)}
                aria-describedby={errors.username ? 'signup-username-error' : undefined}
                className={errors.username ? 'input-error' : ''}
              />
              {errors.username && (
                <p id="signup-username-error" className="field-error">
                  {errors.username}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'signup-email-error' : undefined}
                className={errors.email ? 'input-error' : ''}
              />
              {errors.email && (
                <p id="signup-email-error" className="field-error">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="signup-password">Password</label>
              <div className="password-wrap">
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'signup-password-error' : undefined}
                  className={errors.password ? 'input-error' : ''}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p id="signup-password-error" className="field-error">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="signup-confirm">Confirm Password</label>
              <div className="password-wrap">
                <input
                  id="signup-confirm"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={form.confirmPassword}
                  onChange={(e) => setField('confirmPassword', e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  aria-invalid={Boolean(errors.confirmPassword)}
                  aria-describedby={errors.confirmPassword ? 'signup-confirm-error' : undefined}
                  className={errors.confirmPassword ? 'input-error' : ''}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-pressed={showConfirm}
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="signup-confirm-error" className="field-error">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button type="submit" className="btn btn-primary btn-lg signup-submit" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  Creating Account…
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="signup-footer-link">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
