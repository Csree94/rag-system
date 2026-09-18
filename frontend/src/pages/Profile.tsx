import { LogOut, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const initials = user.username.slice(0, 2).toUpperCase()

  return (
    <div className="p-5 lg:p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-ink tracking-tight anim-fade-up">Profile</h1>

      <section className="bg-card rounded-2xl border border-line shadow-sm p-6 anim-fade-up">
        <div className="flex items-center gap-4">
          <span className="h-16 w-16 rounded-full bg-lavender text-white text-xl font-semibold flex items-center justify-center shrink-0">
            {initials}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink truncate">{user.username}</h2>
            <p className="text-sm text-muted truncate">{user.email}</p>
          </div>
        </div>

        <dl className="mt-6 divide-y divide-line border-t border-line">
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm text-muted">Account status</dt>
            <dd className="flex items-center gap-1.5 text-sm font-medium text-mint">
              <ShieldCheck size={14} aria-hidden="true" /> {user.is_active ? 'Active' : 'Inactive'}
            </dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm text-muted">User ID</dt>
            <dd className="text-sm text-ink font-medium">#{user.id}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm text-muted">Member since</dt>
            <dd className="text-sm text-ink font-medium">{new Date(user.created_at).toLocaleDateString()}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm text-muted">Sign-in method</dt>
            <dd className="text-sm text-ink font-medium">Username / email + password</dd>
          </div>
        </dl>

        <div className="mt-6">
          <Button
            variant="danger"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            <LogOut size={15} aria-hidden="true" /> Log out
          </Button>
        </div>
      </section>
    </div>
  )
}
