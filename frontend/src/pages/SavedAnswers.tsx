import { useCallback, useEffect, useState } from 'react'
import { BookmarkCheck, ClipboardCopy, FileText, MessageSquareText, Trash2 } from 'lucide-react'
import Button from '../components/common/Button'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import Modal from '../components/common/Modal'
import { SkeletonCard } from '../components/common/Loading'
import { deleteSavedAnswer, listSavedAnswers } from '../services/api'
import type { SavedAnswer } from '../services/api'

export default function SavedAnswers() {
  const [answers, setAnswers] = useState<SavedAnswer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SavedAnswer | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAnswers(await listSavedAnswers())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load saved answers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteSavedAnswer(deleteTarget.id)
      setAnswers((prev) => prev.filter((a) => a.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete saved answer')
    } finally {
      setDeleting(false)
    }
  }

  function copy(a: SavedAnswer) {
    void navigator.clipboard.writeText(`${a.question}\n\n${a.answer}`)
    setCopiedId(a.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="anim-fade-up">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Saved Answers</h1>
        <p className="text-sm text-muted mt-0.5">{answers.length} saved answer{answers.length === 1 ? '' : 's'}</p>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="h-36" />
          ))}
        </div>
      ) : answers.length === 0 ? (
        <EmptyState
          icon={<BookmarkCheck size={30} aria-hidden="true" />}
          title="No saved answers yet"
          description="When AI gives you an answer worth keeping, press “Save answer” in chat and it will appear here."
        />
      ) : (
        <div className="space-y-4">
          {answers.map((a, i) => (
            <article
              key={a.id}
              className="bg-card rounded-2xl border border-line p-5 shadow-sm hover:shadow-md transition-all duration-200 anim-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="h-8 w-8 rounded-xl bg-coral-soft text-coral-deep flex items-center justify-center shrink-0" aria-hidden="true">
                  <MessageSquareText size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-ink">{a.question}</h2>
                  <p className="text-xs text-muted mt-0.5">
                    Saved {new Date(a.created_at).toLocaleDateString()} · {a.source_count} source{a.source_count === 1 ? '' : 's'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(a)}
                  className="p-2 rounded-lg text-muted hover:text-coral-deep hover:bg-coral-soft transition-colors shrink-0"
                  aria-label={`Delete answer to "${a.question}"`}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <p className="text-sm text-ink/90 whitespace-pre-wrap leading-relaxed line-clamp-6 bg-cream/60 rounded-xl p-3.5">
                {a.answer}
              </p>

              {a.sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {a.sources.slice(0, 4).map((s) => (
                    <span
                      key={s.chunk_id}
                      title={s.snippet}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-lavender-soft text-lavender-deep text-[11px] font-medium"
                    >
                      <FileText size={10} aria-hidden="true" />
                      Doc {s.document_id.slice(0, 6)} · chunk {s.chunk_index + 1}
                    </span>
                  ))}
                  {a.sources.length > 4 && (
                    <span className="text-[11px] text-muted px-1 py-0.5">+{a.sources.length - 4} more</span>
                  )}
                </div>
              )}

              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  onClick={() => copy(a)}
                  className="text-xs text-muted hover:text-ink inline-flex items-center gap-1 transition-colors"
                >
                  <ClipboardCopy size={12} aria-hidden="true" /> {copiedId === a.id ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Delete Saved Answer">
        <p className="text-sm text-muted mb-5">
          Delete the answer to <strong className="text-ink">“{deleteTarget?.question}”</strong>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={() => void handleDelete()}>
            <Trash2 size={15} aria-hidden="true" /> Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
