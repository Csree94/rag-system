import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MoreVertical, Pencil, Pin, PinOff, Plus, StickyNote, Trash2 } from 'lucide-react'
import Button from '../components/common/Button'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import Modal from '../components/common/Modal'
import { SkeletonCard } from '../components/common/Loading'
import { createNote, deleteNote, listNotes, updateNote } from '../services/api'
import type { Note } from '../services/api'

export default function Notes() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [menuFor, setMenuFor] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setNotes(await listNotes())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // ?new=1 opens the editor
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      openEditor(null)
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  function openEditor(note: Note | null) {
    setEditing(note)
    setTitle(note?.title ?? '')
    setContent(note?.content ?? '')
    setTags(note?.tags.join(', ') ?? '')
    setEditorOpen(true)
  }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)
      if (editing) {
        const updated = await updateNote(editing.id, { title: title.trim(), content, tags: tagList })
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
      } else {
        const created = await createNote(title.trim(), content, tagList, null)
        setNotes((prev) => [created, ...prev])
      }
      setEditorOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  async function togglePin(note: Note) {
    try {
      const updated = await updateNote(note.id, { is_pinned: !note.is_pinned })
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
      setMenuFor(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update note')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteNote(deleteTarget.id)
      setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete note')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 anim-fade-up">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Notes</h1>
          <p className="text-sm text-muted mt-0.5">{notes.length} note{notes.length === 1 ? '' : 's'}</p>
        </div>
        <Button onClick={() => openEditor(null)}>
          <Plus size={16} aria-hidden="true" /> New Note
        </Button>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="h-40" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={<StickyNote size={30} aria-hidden="true" />}
          title="No notes yet"
          description="Capture your thoughts, summaries and ideas in one place."
          action={
            <Button onClick={() => openEditor(null)}>
              <Plus size={16} aria-hidden="true" /> New Note
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {notes.map((note, i) => (
            <div
              key={note.id}
              className={`bg-card rounded-2xl border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 anim-fade-up flex flex-col ${
                note.is_pinned ? 'border-sun/60' : 'border-line'
              }`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-ink truncate">{note.title}</h2>
                  <p className="text-xs text-muted mt-0.5">
                    Updated {new Date(note.updated_at).toLocaleDateString()}
                  </p>
                </div>
                {note.is_pinned && <Pin size={14} className="text-sun shrink-0 mt-1" aria-label="Pinned" />}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setMenuFor(menuFor === note.id ? null : note.id)}
                    className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-cream transition-colors"
                    aria-label={`Options for ${note.title}`}
                    aria-expanded={menuFor === note.id}
                  >
                    <MoreVertical size={15} />
                  </button>
                  {menuFor === note.id && (
                    <div className="absolute right-0 mt-1 w-36 bg-card rounded-xl border border-line shadow-lg py-1 z-10 anim-pop-in" onMouseLeave={() => setMenuFor(null)}>
                      <button type="button" onClick={() => { openEditor(note); setMenuFor(null) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-cream">
                        <Pencil size={13} /> Edit
                      </button>
                      <button type="button" onClick={() => void togglePin(note)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-cream">
                        {note.is_pinned ? <><PinOff size={13} /> Unpin</> : <><Pin size={13} /> Pin</>}
                      </button>
                      <button type="button" onClick={() => { setDeleteTarget(note); setMenuFor(null) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-coral-deep hover:bg-coral-soft">
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted mt-2.5 line-clamp-3 flex-1">
                {note.content || 'Empty note'}
              </p>

              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {note.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-lavender-soft text-lavender-deep text-[11px] font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Editor modal */}
      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? 'Edit Note' : 'New Note'}
        width="max-w-lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleSave()
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="note-title" className="block text-sm font-medium text-ink mb-1.5">Title</label>
            <input
              id="note-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder="Note title"
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-cream/50 text-sm text-ink outline-none focus:border-lavender focus:bg-card transition-colors"
            />
          </div>
          <div>
            <label htmlFor="note-content" className="block text-sm font-medium text-ink mb-1.5">Content</label>
            <textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Write your note…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-cream/50 text-sm text-ink outline-none focus:border-lavender focus:bg-card transition-colors resize-none"
            />
          </div>
          <div>
            <label htmlFor="note-tags" className="block text-sm font-medium text-ink mb-1.5">
              Tags <span className="text-muted font-normal">(comma separated)</span>
            </label>
            <input
              id="note-tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="research, ideas"
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-cream/50 text-sm text-ink outline-none focus:border-lavender focus:bg-card transition-colors"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving} disabled={!title.trim()}>Save</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Delete Note">
        <p className="text-sm text-muted mb-5">
          Delete <strong className="text-ink">{deleteTarget?.title}</strong>? This cannot be undone.
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
