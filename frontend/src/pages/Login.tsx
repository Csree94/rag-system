import { useState } from 'react'
import type { FormEvent } from 'react'
import './Login.css'

/**
 * Login page — connected to the backend JWT authentication API.
 *
 * POST /api/auth/login with { username, password } → 200 { access_token, token_type }.
 * The access_token is stored in localStorage under "access_token" only after a
 * successful login, then verified via GET /api/auth/me (Bearer token).
 *
 * Never logs or displays the password or the JWT. No refresh, no logout, and no
 * RAG workspace yet — those come in later tasks.
 *
 * Client-side validation (UI guidance only — the backend is the authority):
 * - Username/email: required
 * - Password: required, at least 8 characters
 */

type FieldName = 'identifier' | 'password'

const LOGIN_URL = 'http://localhost:8001/api/auth/login'
const ME_URL = 'http://localhost:8001/api/auth/me'
const TOKEN_KEY = 'access_token'

/** Shape of GET /api/auth/me's UserResponse. */
interface MeUser {
  id: number
  username: string
  email: string
  is_active: boolean
  created_at: string
}

/**
 * Map a failed login response to a user-friendly message.
 * Mirrors the backend: 401 bad credentials · 403 inactive user · 422 validation error.
 */
async function toLoginErrorMessage(res: Response): Promise<string> {
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    // Non-JSON body — fall through to the status-based messages below.
  }

  const detail = (body as { detail?: unknown } | null)?.detail

  if (res.status === 401) return 'Incorrect username or password.'
  if (res.status === 403) return 'Your account is inactive.'
  if (res.status === 422) {
    if (typeof detail === 'string') return `Validation error: ${detail}.`
    if (Array.isArray(detail)) {
      const first = detail[0] as { msg?: string } | undefined
      if (first?.msg) {
        const text = first.msg.replace(/^Value error,?\s*/i, '')
        return `Validation error: ${text}.`
      }
    }
    return 'Validation error: please check your details and try again.'
  }
  if (typeof detail === 'string') return detail
  return 'Something went wrong. Please try again.'
}

interface FormState {
  identifier: string
  password: string
}

type FormErrors = Partial<Record<FieldName, string>>

function validateField(name: FieldName, form: FormState): string | undefined {
  switch (name) {
    case 'identifier': {
      const value = form.identifier.trim()
      if (!value) return 'Username or email is required.'
      return undefined
    }
    case 'password': {
      if (!form.password) return 'Password is required.'
      if (form.password.length < 8) return 'Password must be at least 8 characters.'
      return undefined
    }
  }
}

function validateAll(form: FormState): FormErrors {
  return {
    identifier: validateField('identifier', form),
    password: validateField('password', form),
  }
}

/** Small inline SVGs (no icon library needed). */
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

export default function Login({
  onBack,
  onGoToSignup,
  onAuthenticated,
}: {
  onBack: () => void
  onGoToSignup: () => void
  /** Called with the username after login + /api/auth/me succeed. */
  onAuthenticated: (username: string) => void
}) {
  const [form, setForm] = useState<FormState>({ identifier: '', password: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const setField = (name: FieldName, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      // Re-validate touched fields so error messages clear themselves once fixed.
      setErrors((prevErrors) => {
        const nextErrors = { ...prevErrors }
        for (const key of ['identifier', 'password'] as FieldName[]) {
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

    // --- Client-side validation (unchanged) ---
    const nextErrors = validateAll(form)
    setErrors(nextErrors)
    setTouched({ identifier: true, password: true })
    if (Object.values(nextErrors).some(Boolean)) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      // --- Step 1: authenticate ---
      const res = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.identifier.trim(),
          password: form.password,
        }),
      })

      if (!res.ok) {
        throw new Error(await toLoginErrorMessage(res))
      }

      const data = (await res.json()) as { access_token: string }
      const { access_token } = data
      if (!access_token) {
        throw new Error('Something went wrong. Please try again.')
      }

      // Store the token only after a successful login (never the password).
      localStorage.setItem(TOKEN_KEY, access_token)

      // --- Step 2: verify the token and load the profile ---
      let user: MeUser
      try {
        const meRes = await fetch(ME_URL, {
          headers: { Authorization: `Bearer ${access_token}` },
        })
        if (!meRes.ok) {
          throw new Error('me-failed')
        }
        user = (await meRes.json()) as MeUser
      } catch {
        // A login that we cannot verify is treated as not logged in.
        localStorage.removeItem(TOKEN_KEY)
        throw new Error(
          'Your account was verified, but we could not load your profile. Please try again.',
        )
      }

      // Auth complete — clear the password from component state.
      setForm((prev) => ({ ...prev, password: '' }))
      // Hand off to the RAG workspace (App.tsx switches the view).
      onAuthenticated(user.username)
    } catch (err) {
      // fetch() rejects with a TypeError on network failure / CORS / server down.
      setSubmitError(
        err instanceof TypeError
          ? 'Unable to connect to the server. Please make sure the backend is running.'
          : err instanceof Error
            ? err.message
            : 'Something went wrong. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
    // TODO: after /api/auth/me succeeds, transition to the NotebookLM-like RAG
    // workspace instead of the temporary success panel below.
  }

  return (
    <div className="login-page">
      {/* ---------- Left panel: brand + value prop (same split-panel style as Signup) ---------- */}
      <aside className="login-left">
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
          Back to Home
        </button>

        <div className="signup-left-body">
          <h2>Chat with your documents using AI</h2>
          <p>
            Pick up where you left off — ask questions across your PDFs, reports,
            and notes with grounded, citation-backed answers.
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

          <h1>Welcome back</h1>
          <p className="signup-subtitle">Log in to continue to your documents.</p>

          <>
          {submitError && (
            <div className="form-banner form-banner-error" role="alert">
              {submitError}
            </div>
          )}

          <form className="signup-form" onSubmit={handleSubmit} noValidate>
            <div className="form-field">
              <label htmlFor="login-identifier">Username or Email</label>
              <input
                id="login-identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                placeholder="jane-doe or you@example.com"
                value={form.identifier}
                onChange={(e) => setField('identifier', e.target.value)}
                onBlur={() => handleBlur('identifier')}
                aria-invalid={Boolean(errors.identifier)}
                aria-describedby={errors.identifier ? 'login-identifier-error' : undefined}
                className={errors.identifier ? 'input-error' : ''}
              />
              {errors.identifier && (
                <p id="login-identifier-error" className="field-error">
                  {errors.identifier}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="login-password">Password</label>
              <div className="password-wrap">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
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
                <p id="login-password-error" className="field-error">
                  {errors.password}
                </p>
              )}
            </div>

            <button type="submit" className="btn btn-primary btn-lg signup-submit" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  Logging In…
                </>
              ) : (
                'Log In'
              )}
            </button>
          </form>
          </>

          <p className="signup-footer-link">
            Don&apos;t have an account?{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                onGoToSignup()
              }}
            >
              Create an account
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
