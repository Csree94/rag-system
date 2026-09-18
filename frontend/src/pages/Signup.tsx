import { useState } from 'react'
import type { FormEvent } from 'react'
import './Signup.css'

/**
 * Signup page — connected to the backend registration API.
 *
 * POST /api/auth/register with { username, email, password }.
 * Returns 201 with UserResponse { id, username, email, is_active, created_at }.
 * 409 → username/email already registered · 422 → validation error · network → friendly message.
 * Registration does NOT return a JWT, so nothing is stored and the user proceeds to Log In.
 *
 * Validation rules (client-side only, mirrors the backend contract):
 * - Username: required, 3–50 characters
 * - Email: required, basic format check
 * - Password: required, 8–128 characters
 * - Confirm password: required, must match password
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

const REGISTER_URL = 'http://localhost:8001/api/auth/register'

/** Shown after a successful 201 response. */
interface RegisteredUser {
  id: number
  username: string
  email: string
}

/**
 * Extract a user-friendly message from a failed registration response.
 * Mirrors the backend contract: FastAPI error bodies are { detail: string }
 * for 409 and { detail: Array<{ loc, msg, type }> } for 422.
 */
async function toErrorMessage(res: Response): Promise<string> {
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    // Non-JSON body — fall through to generic messages below.
  }

  const detail = (body as { detail?: unknown } | null)?.detail

  if (res.status === 409 && typeof detail === 'string') {
    // Backend sends "Username already registered" / "Email already registered".
    return detail
  }
  if (res.status === 422 && Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined
    if (first?.msg) {
      // FastAPI messages read like "Value error, ..."; trim to the useful part.
      const text = first.msg.replace(/^Value error,?\s*/i, '')
      return `Validation error: ${text}.`
    }
    return 'Validation error: please check your details and try again.'
  }
  if (typeof detail === 'string') return detail
  return 'Something went wrong. Please try again.'
}

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

/** Shared small SVGs for this page. */
function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export default function Signup({ onBack }: { onBack: () => void }) {
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
  const [registeredUser, setRegisteredUser] = useState<RegisteredUser | null>(null)

  const setField = (name: FieldName, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      // Re-validate fields the user has already interacted with, so e.g.
      // "Passwords do not match" clears itself once the user fixes them.
      setErrors((prevErrors) => {
        const nextErrors = { ...prevErrors }
        for (const key of FIELD_NAMES) {
          if (!touched[key]) continue
          const msg = validateField(key, next)
          if (msg) {
            nextErrors[key] = msg
          } else {
            delete nextErrors[key]
          }
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
    setTouched({ username: true, email: true, password: true, confirmPassword: true })
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch(REGISTER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      })

      if (!res.ok) {
        throw new Error(await toErrorMessage(res))
      }

      const user = (await res.json()) as RegisteredUser
      setRegisteredUser(user)
    } catch (err) {
      // fetch() rejects on network failure / CORS / server unreachable.
      setSubmitError(
        err instanceof TypeError
          ? 'Unable to connect to the server. Please make sure the backend is running and try again.'
          : err instanceof Error
            ? err.message
            : 'Something went wrong. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="signup-page">
      {/* ---------- Left panel: brand + value prop ---------- */}
      <aside className="signup-left">
        <button type="button" className="signup-back" onClick={onBack}>
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
        </button>

        <div className="signup-left-body">
          <h2>Chat with your documents using AI</h2>
          <p>
            Upload PDFs, reports, and notes, then ask questions in plain
            language. Every answer is grounded in your own content.
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
              PDF, DOCX, and plain-text support
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

      {/* ---------- Right panel: form card ---------- */}
      <main className="signup-right">
        <div className="signup-card">
          <div className="signup-logo">
            <span className="logo-mark" aria-hidden="true">
              <SparkleIcon />
            </span>
            <span className="logo-text">RAG System</span>
          </div>

          {registeredUser ? (
            <div className="signup-success" role="status">
              <span className="signup-success-icon" aria-hidden="true">
                <CheckIcon />
              </span>
              <h1>Account created!</h1>
              <p className="signup-success-text">
                Welcome, <strong>{registeredUser.username}</strong> — your account is ready.
              </p>
              <p className="signup-success-hint">
                Registration doesn&apos;t sign you in yet. Continue to log in with your new
                credentials.
              </p>
              <a href="#" className="btn btn-primary btn-lg signup-success-btn">
                Proceed to Log In
              </a>
            </div>
          ) : (
            <>
          <h1>Create your account</h1>
          <p className="signup-subtitle">
            Start chatting with your documents in minutes.
          </p>

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
                  <EyeIcon off={showPassword} />
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
                  <EyeIcon off={showConfirm} />
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
            </>
          )}

          <p className="signup-footer-link">
            Already have an account? <a href="#">Log in</a>
          </p>
        </div>
      </main>
    </div>
  )
}
