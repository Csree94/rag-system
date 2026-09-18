import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  CloudUpload,
  FileSpreadsheet,
  FileText,
  Loader2,
  MoreVertical,
  Trash2,
  XCircle,
} from 'lucide-react'
import Button from '../components/common/Button'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import Modal from '../components/common/Modal'
import { SkeletonCard } from '../components/common/Loading'
import { deleteDocument, listDocuments, listNotebooks, uploadDocument } from '../services/api'
import type { DocumentMeta, Notebook } from '../services/api'

/** Upload pipeline stages shown while the request is in flight. */
const STAGES = [
  'Uploading',
  'Extracting text',
  'Cleaning',
  'Chunking',
  'Generating embeddings',
  'Indexing',
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(type: string) {
  if (['xlsx', 'xls', 'csv'].includes(type)) return FileSpreadsheet
  return FileText
}

function StatusBadge({ status }: { status: DocumentMeta['status'] }) {
  if (status === 'ready')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-mint-soft text-mint">
        <CheckCircle2 size={11} aria-hidden="true" /> Ready
      </span>
    )
  if (status === 'failed')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-coral-soft text-coral-deep">
        <XCircle size={11} aria-hidden="true" /> Failed
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-lavender-soft text-lavender-deep">
      <Loader2 size={11} className="animate-spin" aria-hidden="true" /> Processing
    </span>
  )
}

interface UploadJob {
  filename: string
  stageIdx: number
  done: boolean
  failed: boolean
}

export default function Documents() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [docs, setDocs] = useState<DocumentMeta[]>([])
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [jobs, setJobs] = useState<UploadJob[]>([])
  const [targetNotebook, setTargetNotebook] = useState<string>('')
  const [menuFor, setMenuFor] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DocumentMeta | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ds, nbs] = await Promise.all([listDocuments(), listNotebooks()])
      setDocs(ds)
      setNotebooks(nbs)
      setTargetNotebook((prev) => prev || String(nbs[0]?.id ?? 'default'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Open the picker via ?upload=1 — but only on a real user gesture
  // (browsers block programmatic .click() without user activation).
  useEffect(() => {
    if (searchParams.get('upload') !== '1') return
    setSearchParams({}, { replace: true })
    // Respect the gesture window: click inside the first ~2s after navigation
    const start = Date.now()
    const tryOpen = () => {
      if (Date.now() - start > 2000) return
      try {
        fileRef.current?.click()
      } catch {
        // User activation expired — user can click "Browse Files" manually
      }
    }
    tryOpen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Advance the stage ticker while uploads run
  useEffect(() => {
    if (jobs.length === 0) return
    const t = setInterval(() => {
      setJobs((prev) =>
        prev.map((j) =>
          !j.done && !j.failed && j.stageIdx < STAGES.length - 1
            ? { ...j, stageIdx: j.stageIdx + 1 }
            : j,
        ),
      )
    }, 900)
    return () => clearInterval(t)
  }, [jobs.length])

  async function handleFiles(files: FileList | File[] | null) {
    if (!files || (files as FileList).length === 0) return
    const arr = Array.from(files as FileList)
    setJobs(arr.map((f) => ({ filename: f.name, stageIdx: 0, done: false, failed: false })))

    for (let i = 0; i < arr.length; i++) {
      try {
        await uploadDocument(arr[i], targetNotebook || 'default')
        setJobs((prev) => prev.map((j, idx) => (idx === i ? { ...j, done: true, stageIdx: STAGES.length - 1 } : j)))
      } catch {
        setJobs((prev) => prev.map((j, idx) => (idx === i ? { ...j, failed: true } : j)))
      }
    }
    await load()
    // Clear finished jobs after a pause
    setTimeout(() => setJobs([]), 4000)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteDocument(deleteTarget.id)
      setDocs((prev) => prev.filter((d) => d.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete document')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="anim-fade-up">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Documents</h1>
        <p className="text-sm text-muted mt-0.5">{docs.length} indexed document{docs.length === 1 ? '' : 's'}</p>
      </div>

      {/* Upload zone */}
      <section
        className={`relative bg-card rounded-2xl border-2 border-dashed p-8 lg:p-10 text-center transition-all duration-200 anim-fade-up
          ${dragging ? 'border-lavender bg-lavender-soft/40 scale-[1.01]' : 'border-line hover:border-lavender/50'}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void handleFiles(e.dataTransfer.files)
        }}
        aria-label="Upload documents"
      >
        <span className="inline-flex h-14 w-14 rounded-2xl bg-lavender-soft items-center justify-center text-lavender mb-4">
          <CloudUpload size={26} aria-hidden="true" />
        </span>
        <h2 className="font-semibold text-ink">Drop your documents here</h2>
        <p className="text-sm text-muted mt-1">
          or{' '}
          <button type="button" onClick={() => fileRef.current?.click()} className="text-lavender-deep font-medium hover:underline">
            Browse Files
          </button>
        </p>
        <p className="text-xs text-muted mt-3">
          Supports PDF · DOCX · XLSX · TXT · Markdown · CSV — max 20 MB
        </p>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx,.xls,.txt,.md,.csv"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
          aria-label="Choose files to upload"
        />
      </section>

      {/* Notebook target selector */}
      {notebooks.length > 0 && (
        <div className="flex items-center gap-2.5 text-sm anim-fade-up">
          <label htmlFor="target-nb" className="text-muted">Uploads go to:</label>
          <select
            id="target-nb"
            value={targetNotebook}
            onChange={(e) => setTargetNotebook(e.target.value)}
            className="h-9 px-3 rounded-xl border border-line bg-card text-sm text-ink outline-none focus:border-lavender"
          >
            {notebooks.map((nb) => (
              <option key={nb.id} value={nb.id}>{nb.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Active upload jobs */}
      {jobs.length > 0 && (
        <section className="space-y-2.5" aria-label="Upload progress">
          {jobs.map((j, i) => (
            <div key={`${j.filename}-${i}`} className="bg-card rounded-xl border border-line p-4 anim-fade-up">
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <p className="text-sm font-medium text-ink truncate">{j.filename}</p>
                {j.failed ? (
                  <span className="text-xs text-coral-deep font-medium">Failed</span>
                ) : j.done ? (
                  <span className="inline-flex items-center gap-1 text-xs text-mint font-medium">
                    <CheckCircle2 size={13} aria-hidden="true" /> Ready
                  </span>
                ) : (
                  <Loader2 size={14} className="animate-spin text-lavender" aria-hidden="true" />
                )}
              </div>
              {!j.done && !j.failed && (
                <>
                  <div className="h-1.5 rounded-full bg-cream overflow-hidden">
                    <div
                      className="h-full bg-lavender rounded-full transition-all duration-500"
                      style={{ width: `${((j.stageIdx + 1) / STAGES.length) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted mt-1.5">{STAGES[j.stageIdx]}…</p>
                </>
              )}
            </div>
          ))}
        </section>
      )}

      {error && <ErrorState message={error} onRetry={load} />}

      {/* Document list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} className="h-20" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={<FileText size={30} aria-hidden="true" />}
          title="No documents yet"
          description="Upload your first document and it will be chunked, embedded and ready for questions."
          action={
            <Button onClick={() => fileRef.current?.click()}>
              <CloudUpload size={16} aria-hidden="true" /> Upload Document
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {docs.map((d, i) => {
            // Defensive defaults: tolerate documents persisted before the
            // metadata backfill (missing file_type / size / counts).
            const fileType = d.file_type ?? 'file'
            const Icon = fileIcon(fileType)
            return (
              <div
                key={d.id}
                className="group bg-card rounded-2xl border border-line p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200 anim-fade-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className="h-11 w-11 rounded-xl bg-lavender-soft text-lavender-deep flex items-center justify-center shrink-0">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">{d.filename ?? d.document_uuid ?? 'Untitled document'}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {fileType.toUpperCase()} · {formatBytes(d.size_bytes ?? 0)} · {d.page_count ?? 0} page{(d.page_count ?? 0) === 1 ? '' : 's'} ·{' '}
                    {d.chunk_count ?? 0} chunks · {d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
                <StatusBadge status={d.status} />
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setMenuFor(menuFor === d.id ? null : d.id)}
                    className="p-2 rounded-lg text-muted hover:text-ink hover:bg-cream transition-colors"
                    aria-label={`Options for ${d.filename ?? 'document'}`}
                    aria-expanded={menuFor === d.id}
                  >
                    <MoreVertical size={16} />
                  </button>
                  {menuFor === d.id && (
                    <div className="absolute right-0 mt-1 w-40 bg-card rounded-xl border border-line shadow-lg py-1 z-10 anim-pop-in" onMouseLeave={() => setMenuFor(null)}>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(d)
                          setMenuFor(null)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-coral-deep hover:bg-coral-soft"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirm */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Delete Document">
        <p className="text-sm text-muted mb-5">
          Delete <strong className="text-ink">{deleteTarget?.filename}</strong>? Its indexed chunks will be removed and
          it can no longer be used to answer questions.
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
