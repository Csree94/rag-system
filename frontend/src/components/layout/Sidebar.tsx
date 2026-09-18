import { NavLink, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Library,
  FileText,
  MessageSquareText,
  Sparkles,
  StickyNote,
  BookmarkCheck,
  Settings,
  UserRound,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react'
import type { Notebook } from '../../services/api'

interface SidebarProps {
  recentNotebooks: Notebook[]
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/notebooks', label: 'My Notebooks', icon: Library },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/chat', label: 'AI Chat', icon: MessageSquareText },
  { to: '/insights', label: 'AI Insights', icon: Sparkles },
  { to: '/notes', label: 'Notes', icon: StickyNote },
  { to: '/saved', label: 'Saved Answers', icon: BookmarkCheck },
]

const colorDot: Record<string, string> = {
  lavender: 'bg-lavender',
  coral: 'bg-coral',
  sun: 'bg-sun',
  mint: 'bg-mint',
}

export default function Sidebar({
  recentNotebooks,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Main navigation">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onCloseMobile}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
            ${isActive
              ? 'bg-lavender text-white shadow-sm'
              : 'text-ink/80 hover:bg-white hover:text-ink hover:shadow-sm'}`
          }
        >
          <Icon size={18} className="shrink-0" aria-hidden="true" />
          {!collapsed && <span className="truncate">{label}</span>}
        </NavLink>
      ))}

      {!collapsed && (
        <div className="pt-6">
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Recent Notebooks</p>
            <Link
              to="/notebooks?new=1"
              onClick={onCloseMobile}
              className="p-1 rounded-md text-muted hover:text-lavender hover:bg-white transition-colors"
              aria-label="Create notebook"
            >
              <Plus size={14} />
            </Link>
          </div>
          <ul className="space-y-0.5">
            {recentNotebooks.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted">No notebooks yet</li>
            )}
            {recentNotebooks.slice(0, 4).map((nb) => (
              <li key={nb.id}>
                <Link
                  to={`/notebooks/${nb.id}`}
                  onClick={onCloseMobile}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-ink/80 hover:bg-white hover:shadow-sm transition-all duration-200"
                >
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${colorDot[nb.color] ?? 'bg-lavender'}`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{nb.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  )

  const footer = (
    <div className="px-3 pb-4 space-y-1 border-t border-line pt-3">
      <NavLink
        to="/settings"
        onClick={onCloseMobile}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
          ${isActive ? 'bg-lavender-soft text-lavender-deep' : 'text-ink/80 hover:bg-white hover:shadow-sm'}`
        }
      >
        <Settings size={18} aria-hidden="true" />
        {!collapsed && <span>Settings</span>}
      </NavLink>
      <NavLink
        to="/profile"
        onClick={onCloseMobile}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
          ${isActive ? 'bg-lavender-soft text-lavender-deep' : 'text-ink/80 hover:bg-white hover:shadow-sm'}`
        }
      >
        <UserRound size={18} aria-hidden="true" />
        {!collapsed && <span>Profile</span>}
      </NavLink>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-sidebar border-r border-line transition-[width] duration-300
          ${collapsed ? 'w-[76px]' : 'w-64'}`}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 shrink-0">
          <span className="h-8 w-8 rounded-xl bg-lavender text-white flex items-center justify-center text-sm font-bold shrink-0">
            ✦
          </span>
          {!collapsed && <span className="font-semibold text-ink whitespace-nowrap">Notebook AI</span>}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="ml-auto p-1.5 rounded-lg text-muted hover:text-ink hover:bg-white/70 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        {nav}
        {footer}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden anim-fade-in" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" onMouseDown={onCloseMobile} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-line flex flex-col anim-pop-in shadow-xl">
            <div className="flex items-center gap-2.5 px-5 h-16">
              <span className="h-8 w-8 rounded-xl bg-lavender text-white flex items-center justify-center text-sm font-bold">
                ✦
              </span>
              <span className="font-semibold text-ink">Notebook AI</span>
              <button
                type="button"
                onClick={onCloseMobile}
                className="ml-auto p-1.5 rounded-lg text-muted hover:text-ink hover:bg-white/70"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}
    </>
  )
}
