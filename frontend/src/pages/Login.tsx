import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/api'
import './Login.css'

/**
 * Login page — connected to the backend JWT authentication API via the
 * shared auth context. On success the user lands in the dashboard.
 */

type FieldName = 'identifier' | 'password'

interface FormState {
  identifier: string
  password: string
}

type FormErrors = Partial<Record<FieldName, string>>

function validateField(name: FieldName, form: FormState): string | undefined {
  switch (name) {
    case 'identifier': {
      if (!form.identifier.trim()) return 'Username or email is required.'
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

function CheckIcon() {
  return <Check size={15} strokeWidth={2.2} aria-hidden="true" />
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>({ identifier: '', password: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const setField = (name: FieldName, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      setErrors((prevErrors) => {
        const nextErrors = { ...prevErrors }
        for (const key of ['identifier', 'password'] as FieldName[]) {
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
    setTouched({ identifier: true, password: true })
    if (Object.values(nextErrors).some(Boolean)) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      await login(form.identifier.trim(), form.password)
      // Auth context now holds the user; the route guard shows the dashboard.
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      {/* ---------- Left panel: brand + value prop ---------- */}
      <aside className="login-left">
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
          Back to Home
        </Link>

        <div className="signup-left-body">
          <h2>Chat with your documents using AI</h2>
          <p>
            Pick up where you left off — ask questions across your PDFs, reports, and notes with
            grounded, citation-backed answers.
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

      {/* ---------- Right panel: form card ---------- */}
      <main className="signup-right">
        <div className="signup-card">
          <div className="signup-logo">
            <span className="logo-mark" aria-hidden="true">
              ✦
            </span>
            <span className="logo-text">Notebook AI</span>
          </div>

          <h1>Welcome back</h1>
          <p className="signup-subtitle">Log in to continue to your documents.</p>

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
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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

          <p className="signup-footer-link">
            Don&apos;t have an account?{' '}
            <Link to="/signup">Create an account</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
