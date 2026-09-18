import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, Search, Settings, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

interface TopbarProps {
  onOpenSearch: () => void
  onOpenMobileMenu: () => void
}

interface Notification {
  id: number
  tone: 'success' | 'warning' | 'info'
  text: string
  time: string
}

export default function Topbar({ onOpenSearch, onOpenMobileMenu }: TopbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Demo notifications (no backend notifications endpoint exists yet)
  const notifications: Notification[] = [
    { id: 1, tone: 'success', text: 'Document processing completed', time: '2 min ago' },
    { id: 2, tone: 'info', text: 'AI summary generated', time: '1 hour ago' },
    { id: 3, tone: 'warning', text: 'A document failed to process', time: 'Yesterday' },
  ]

  // Close dropdowns on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? 'AI'

  return (
    <header className="h-16 shrink-0 bg-cream/85 backdrop-blur border-b border-line flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-30">
      {/* Mobile menu */}
      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="lg:hidden p-2 rounded-xl text-ink hover:bg-white transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      {/* Search trigger */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex-1 max-w-xl flex items-center gap-2.5 h-10 px-4 rounded-xl bg-white border border-line text-sm text-muted
          hover:border-lavender/40 hover:shadow-sm transition-all duration-200"
      >
        <Search size={16} aria-hidden="true" />
        <span className="truncate">Search notebooks, documents and answers…</span>
        <kbd className="ml-auto hidden md:inline text-[10px] px-1.5 py-0.5 rounded border border-line bg-cream text-muted">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5" ref={wrapRef}>
        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((v) => !v)
              setMenuOpen(false)
            }}
            className="relative p-2.5 rounded-xl text-ink/80 hover:bg-white hover:shadow-sm transition-all duration-200"
            aria-label={`Notifications (${notifications.length})`}
            aria-expanded={notifOpen}
          >
            <Bell size={19} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-coral ring-2 ring-cream" aria-hidden="true" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-card rounded-2xl border border-line shadow-xl anim-pop-in overflow-hidden">
              <div className="px-4 py-3 border-b border-line">
                <p className="text-sm font-semibold text-ink">Notifications</p>
              </div>
              <ul className="max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <li key={n.id} className="flex gap-3 px-4 py-3 hover:bg-cream/60 transition-colors">
                    <span
                      className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                        n.tone === 'success' ? 'bg-mint' : n.tone === 'warning' ? 'bg-sun' : 'bg-lavender'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-ink">{n.text}</p>
                      <p className="text-xs text-muted mt-0.5">{n.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setMenuOpen((v) => !v)
              setNotifOpen(false)
            }}
            className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl hover:bg-white hover:shadow-sm transition-all duration-200"
            aria-expanded={menuOpen}
            aria-label="Open profile menu"
          >
            <span className="h-8 w-8 rounded-full bg-lavender text-white text-xs font-semibold flex items-center justify-center">
              {initials}
            </span>
            <span className="hidden sm:block text-sm font-medium text-ink max-w-[120px] truncate">
              {user?.username ?? 'Account'}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-card rounded-2xl border border-line shadow-xl anim-pop-in overflow-hidden">
              <div className="px-4 py-3 border-b border-line">
                <p className="text-sm font-semibold text-ink truncate">{user?.username}</p>
                <p className="text-xs text-muted truncate">{user?.email}</p>
              </div>
              <div className="p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('/profile')
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink hover:bg-cream transition-colors"
                >
                  <UserRound size={15} aria-hidden="true" /> Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('/settings')
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink hover:bg-cream transition-colors"
                >
                  <Settings size={15} aria-hidden="true" /> Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    logout()
                    navigate('/login')
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-coral-deep hover:bg-coral-soft transition-colors"
                >
                  <LogOut size={15} aria-hidden="true" /> Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
