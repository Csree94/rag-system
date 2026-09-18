import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  FileText,
  MessageSquareText,
  Sparkles,
  TrendingUp,
  Plus,
  Upload,
  PenLine,
  ArrowRight,
  Notebook as NotebookIcon,
} from 'lucide-react'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import ErrorState from '../components/common/ErrorState'
import { SkeletonCard } from '../components/common/Loading'
import { createNotebook, getStats, listNotebooks } from '../services/api'
import type { Notebook, Stats } from '../services/api'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const colorClasses: Record<string, { chip: string; bar: string }> = {
  lavender: { chip: 'bg-lavender-soft text-lavender-deep', bar: 'bg-lavender' },
  coral: { chip: 'bg-coral-soft text-coral-deep', bar: 'bg-coral' },
  sun: { chip: 'bg-sun-soft text-ink', bar: 'bg-sun' },
  mint: { chip: 'bg-mint-soft text-mint', bar: 'bg-mint' },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, nbs] = await Promise.all([getStats(), listNotebooks()])
      setStats(s)
      setNotebooks(nbs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const nb = await createNotebook(newName.trim())
      setCreateOpen(false)
      setNewName('')
      navigate(`/notebooks/${nb.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create notebook')
    } finally {
      setCreating(false)
    }
  }

  const statCards = [
    { label: 'Notebooks', value: stats?.notebooks ?? 0, icon: BookOpen, chip: 'bg-lavender-soft text-lavender-deep', trend: 'Active' },
    { label: 'Documents', value: stats?.documents ?? 0, icon: FileText, chip: 'bg-sun-soft text-ink', trend: 'Indexed' },
    { label: 'Questions', value: stats?.questions ?? 0, icon: MessageSquareText, chip: 'bg-mint-soft text-mint', trend: 'Answered' },
    { label: 'AI Insights', value: stats?.ai_insights ?? 0, icon: Sparkles, chip: 'bg-coral-soft text-coral-deep', trend: 'Generated' },
  ]

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Welcome */}
      <section className="anim-fade-up">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-ink tracking-tight">
              {greeting()} 👋
            </h1>
            <p className="text-muted mt-1">Turn your documents into knowledge.</p>
          </div>
          <div className="flex gap-2.5">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} aria-hidden="true" /> Create Notebook
            </Button>
            <Button variant="outline" onClick={() => navigate('/documents?upload=1')}>
              <Upload size={16} aria-hidden="true" /> Upload Documents
            </Button>
          </div>
        </div>
      </section>

      {error && <ErrorState message={error} onRetry={load} />}

      {/* Stats */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-4" aria-label="Statistics">
        {loading && stats === null
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-32" />)
          : statCards.map(({ label, value, icon: Icon, chip, trend }, i) => (
              <div
                key={label}
                className="bg-card rounded-2xl border border-line p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 anim-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`h-10 w-10 rounded-xl flex items-center justify-center ${chip}`}>
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-mint bg-mint-soft px-2 py-0.5 rounded-full">
                    <TrendingUp size={11} aria-hidden="true" /> {trend}
                  </span>
                </div>
                <p className="text-3xl font-semibold text-ink tracking-tight">{value}</p>
                <p className="text-sm text-muted mt-0.5">{label}</p>
              </div>
            ))}
      </section>

      {/* Recent notebooks */}
      <section aria-label="Recent notebooks">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink">Recent Notebooks</h2>
          <Link to="/notebooks" className="text-sm text-lavender-deep hover:text-lavender font-medium inline-flex items-center gap-1">
            View all <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>

        {loading && notebooks.length === 0 ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} className="h-44" />
            ))}
          </div>
        ) : notebooks.length === 0 ? (
          <div className="bg-card rounded-2xl border border-dashed border-line py-14 text-center anim-fade-up">
            <NotebookIcon size={32} className="mx-auto text-lavender mb-3" aria-hidden="true" />
            <h3 className="font-semibold text-ink mb-1">No notebooks yet</h3>
            <p className="text-sm text-muted mb-5 max-w-sm mx-auto">
              Create your first notebook and start turning documents into knowledge.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} aria-hidden="true" /> Create Notebook
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {notebooks.slice(0, 6).map((nb, i) => {
              const c = colorClasses[nb.color] ?? colorClasses.lavender
              return (
                <Link
                  key={nb.id}
                  to={`/notebooks/${nb.id}`}
                  className="group bg-card rounded-2xl border border-line p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 anim-fade-up relative overflow-hidden"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <span className={`absolute top-0 left-0 h-full w-1 ${c.bar}`} aria-hidden="true" />
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${c.chip}`}>
                    <NotebookIcon size={18} aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-ink group-hover:text-lavender-deep transition-colors">{nb.name}</h3>
                  <p className="text-sm text-muted mt-0.5 line-clamp-1">{nb.description || 'No description'}</p>
                  <div className="flex items-center gap-4 mt-4 text-xs text-muted">
                    <span>{nb.source_count} sources</span>
                    <span>{nb.question_count} questions</span>
                    <span className="ml-auto">{new Date(nb.updated_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section aria-label="Quick actions">
        <h2 className="text-lg font-semibold text-ink mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {[
            { label: 'Create Notebook', icon: Plus, to: null, action: () => setCreateOpen(true), chip: 'bg-lavender-soft text-lavender-deep' },
            { label: 'Upload Document', icon: Upload, to: '/documents?upload=1', chip: 'bg-sun-soft text-ink' },
            { label: 'Ask AI', icon: MessageSquareText, to: '/chat', chip: 'bg-coral-soft text-coral-deep' },
            { label: 'Generate Summary', icon: Sparkles, to: '/insights', chip: 'bg-mint-soft text-mint' },
            { label: 'Create Note', icon: PenLine, to: '/notes?new=1', chip: 'bg-lavender-soft text-lavender-deep' },
          ].map(({ label, icon: Icon, to, action, chip }) => (
            <button
              key={label}
              type="button"
              onClick={() => (to ? navigate(to) : action?.())}
              className="bg-card rounded-2xl border border-line p-4 flex flex-col items-start gap-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-lavender/40 transition-all duration-200 text-left"
            >
              <span className={`h-9 w-9 rounded-xl flex items-center justify-center ${chip}`}>
                <Icon size={16} aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-ink">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Create notebook modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Notebook">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleCreate()
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="nb-name" className="block text-sm font-medium text-ink mb-1.5">
              Name
            </label>
            <input
              id="nb-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. AI Course"
              autoFocus
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-cream/50 text-sm text-ink outline-none focus:border-lavender focus:bg-card transition-colors"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating} disabled={!newName.trim()}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
