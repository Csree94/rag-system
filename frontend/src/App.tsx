import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import Loading from './components/common/Loading'
import Dashboard from './pages/Dashboard'
import Notebooks from './pages/Notebooks'
import NotebookDetail from './pages/NotebookDetail'
import Documents from './pages/Documents'
import Chat from './pages/Chat'
import Insights from './pages/Insights'
import Notes from './pages/Notes'
import SavedAnswers from './pages/SavedAnswers'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Signup from './pages/Signup'

/** Redirects unauthenticated users to /login; authenticated to /dashboard. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Loading label="Checking your session…" />
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

/** Login/Signup pages redirect to the dashboard when already signed in. */
function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth()
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Loading label="Checking your session…" />
      </div>
    )
  }
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/** Scrolls to top on route change. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<LandingRedirect />} />

      {/* Auth pages (no layout) */}
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/signup"
        element={
          <RedirectIfAuthed>
            <SignupPage />
          </RedirectIfAuthed>
        }
      />

      {/* App (authed, persistent layout) */}
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/notebooks" element={<Notebooks />} />
        <Route path="/notebooks/:id" element={<NotebookDetail />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/saved" element={<SavedAnswers />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

/**
 * Landing page: the existing marketing App content is preserved below,
 * routed at "/" for logged-out visitors. Authed users go to the dashboard.
 */
function LandingRedirect() {
  const { user, initializing } = useAuth()
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Loading label="Loading…" />
      </div>
    )
  }
  if (user) return <Navigate to="/dashboard" replace />
  return <LandingPage />
}

function LoginPage() {
  return <Login />
}

function SignupPage() {
  return <Signup />
}

// Existing marketing landing page (preserved from the original app)
import Landing from './pages/Landing'
function LandingPage() {
  return <Landing />
}

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <AppRoutes />
    </AuthProvider>
  )
}
