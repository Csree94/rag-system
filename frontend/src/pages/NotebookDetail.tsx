import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Brain,
  Check,
  ClipboardCopy,
  FileText,
  HelpCircle,
  Layers,
  ListChecks,
  MessageSquareText,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  StickyNote,
  Target,
  Upload,
  X,
} from 'lucide-react'
import Button from '../components/common/Button'
import ErrorState from '../components/common/ErrorState'
import Loading from '../components/common/Loading'
import { askQuestion, getNotebook, saveAnswer, uploadDocument } from '../services/api'
import type { ChatResponse, NotebookDetail as NotebookDetailType } from '../services/api'

interface ChatMsg {
  role: 'user' | 'assistant'
  text: string
  sources?: ChatResponse['sources']
  foundContext?: boolean
}

const tools = [
  { id: 'summary', label: 'Summary', icon: Sparkles, prompt: 'Provide a concise summary of the key points across my sources.' },
  { id: 'faq', label: 'FAQ', icon: HelpCircle, prompt: 'List frequently asked questions about the content of my sources, with brief answers.' },
  { id: 'concepts', label: 'Key Concepts', icon: Brain, prompt: 'Explain the key concepts found in my sources.' },
  { id: 'guide', label: 'Study Guide', icon: ListChecks, prompt: 'Create a study guide from my sources.' },
  { id: 'quiz', label: 'Quiz', icon: Target, prompt: 'Create a short quiz based on my sources.' },
]

export default function NotebookDetail() {
  const { id } = useParams<{ id: string }>()
  const notebookId = Number(id)
  const [nb, setNb] = useState<NotebookDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Upload state
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadNote, setUploadNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setNb(await getNotebook(notebookId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notebook')
    } finally {
      setLoading(false)
    }
  }, [notebookId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  async function ask(question: string) {
    if (!question.trim() || thinking) return
    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setInput('')
    setThinking(true)
    try {
      const res = await askQuestion(question)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: res.answer, sources: res.sources, foundContext: res.found_context },
      ])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: e instanceof Error ? e.message : 'The AI request failed. Please try again.', foundContext: false },
      ])
    } finally {
      setThinking(false)
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadNote(null)
    let ok = 0
    let failed = 0
    for (const file of Array.from(files)) {
      try {
        await uploadDocument(file, notebookId)
        ok += 1
      } catch {
        failed += 1
      }
    }
    setUploading(false)
    setUploadNote(
      failed === 0
        ? `${ok} document${ok === 1 ? '' : 's'} processed and indexed.`
        : `${ok} uploaded, ${failed} failed. Unsupported or unreadable files were skipped.`,
    )
    await load()
  }

  if (loading) return <Loading label="Loading notebook…" />
  if (error || !nb)
    return (
      <div className="p-8 max-w-lg mx-auto">
        <ErrorState message={error ?? 'Notebook not found.'} onRetry={load} />
      </div>
    )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 lg:px-8 h-16 border-b border-line bg-card/60 backdrop-blur shrink-0">
        <Link to="/notebooks" className="p-2 -ml-2 rounded-xl text-muted hover:text-ink hover:bg-cream transition-colors" aria-label="Back to notebooks">
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0">
          <h1 className="font-semibold text-ink truncate">{nb.name}</h1>
          <p className="text-xs text-muted">{nb.source_count} sources · {nb.question_count} questions</p>
        </div>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => fileRef.current?.click()} loading={uploading}>
          <Upload size={14} aria-hidden="true" /> Add source
        </Button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx,.txt,.md,.csv"
          className="hidden"
          onChange={(e) => void handleUpload(e.target.files)}
          aria-label="Upload documents"
        />
      </div>
      {uploadNote && (
        <div className="px-5 lg:px-8 py-2.5 bg-mint-soft text-mint text-sm flex items-center gap-2 anim-fade-in">
          <Check size={15} aria-hidden="true" /> {uploadNote}
          <button type="button" onClick={() => setUploadNote(null)} className="ml-auto p-0.5 hover:opacity-70" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0 flex-col xl:flex-row">
        {/* LEFT: sources */}
        <aside className="xl:w-64 shrink-0 border-b xl:border-b-0 xl:border-r border-line bg-sidebar/50 p-4 overflow-y-auto max-h-52 xl:max-h-none">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
            <Layers size={13} aria-hidden="true" /> Sources
          </h2>
          {nb.documents.length === 0 ? (
            <p className="text-sm text-muted py-4 text-center">No sources yet. Upload PDF, DOCX or TXT files.</p>
          ) : (
            <ul className="space-y-1.5">
              {nb.documents.map((d) => (
                <li key={d.id} className="flex items-center gap-2.5 px-3 py-2.5 bg-card rounded-xl border border-line text-sm">
                  <FileText size={15} className="text-lavender shrink-0" aria-hidden="true" />
                  <span className="truncate text-ink">{d.filename}</span>
                  <span className="ml-auto text-[11px] text-muted shrink-0">{d.chunk_count} ch</span>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-line text-sm text-muted hover:text-lavender hover:border-lavender/50 transition-colors"
          >
            <Plus size={14} aria-hidden="true" /> Add source
          </button>
        </aside>

        {/* CENTER: chat */}
        <section className="flex-1 flex flex-col min-w-0 min-h-[420px]" aria-label="AI chat">
          <div className="flex-1 overflow-y-auto p-5 lg:p-6 space-y-5">
            {messages.length === 0 && (
              <div className="text-center py-14 anim-fade-up">
                <span className="inline-flex h-14 w-14 rounded-2xl bg-lavender-soft items-center justify-center text-lavender mb-4">
                  <MessageSquareText size={24} aria-hidden="true" />
                </span>
                <h3 className="font-semibold text-ink mb-1">Ask anything about your sources</h3>
                <p className="text-sm text-muted max-w-sm mx-auto mb-6">
                  Answers are grounded in this notebook&apos;s documents with citations.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {tools.slice(0, 3).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => void ask(t.prompt)}
                      className="px-3.5 py-2 rounded-xl bg-card border border-line text-sm text-ink hover:border-lavender/50 hover:bg-lavender-soft/40 transition-all"
                    >
                      <t.icon size={14} className="inline mr-1.5 -mt-0.5 text-lavender" aria-hidden="true" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 anim-fade-up ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && (
                  <span className="h-8 w-8 rounded-xl bg-lavender text-white flex items-center justify-center text-xs shrink-0" aria-hidden="true">✦</span>
                )}
                <div className={`max-w-[85%] md:max-w-[75%] ${m.role === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-lavender text-white rounded-br-md'
                        : 'bg-card border border-line text-ink rounded-tl-md'
                    }`}
                  >
                    {m.text}
                  </div>

                  {/* Citations */}
                  {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                    <div className="mt-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">Sources</p>
                      <div className="flex flex-wrap gap-1.5">
                        {m.sources.map((s) => (
                          <span
                            key={s.chunk_id}
                            title={s.snippet}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-lavender-soft text-lavender-deep text-[11px] font-medium"
                          >
                            <FileText size={11} aria-hidden="true" />
                            Doc {s.document_id.slice(0, 6)} · chunk {s.chunk_index + 1}
                            {s.similarity_score !== null && ` · ${Math.round(s.similarity_score * 100)}%`}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2.5">
                        <button
                          type="button"
                          onClick={() => void navigator.clipboard.writeText(m.text)}
                          className="text-xs text-muted hover:text-ink inline-flex items-center gap-1 transition-colors"
                        >
                          <ClipboardCopy size={12} aria-hidden="true" /> Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void saveAnswer(messages[i - 1]?.text ?? '', m.text, m.sources ?? [], notebookId)
                          }}
                          className="text-xs text-muted hover:text-lavender-deep inline-flex items-center gap-1 transition-colors"
                        >
                          <StickyNote size={12} aria-hidden="true" /> Save answer
                        </button>
                        <button
                          type="button"
                          onClick={() => void ask(messages[i - 1]?.text ?? '')}
                          className="text-xs text-muted hover:text-ink inline-flex items-center gap-1 transition-colors"
                        >
                          <RotateCcw size={12} aria-hidden="true" /> Regenerate
                        </button>
                      </div>
                    </div>
                  )}
                  {m.role === 'assistant' && m.foundContext === false && (
                    <p className="text-xs text-sun mt-1.5">No relevant context was found in your sources.</p>
                  )}
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex gap-3 anim-fade-in">
                <span className="h-8 w-8 rounded-xl bg-lavender text-white flex items-center justify-center text-xs shrink-0" aria-hidden="true">✦</span>
                <div className="bg-card border border-line rounded-2xl rounded-tl-md px-4 py-3.5 flex items-center gap-1.5" role="status" aria-label="AI is thinking">
                  <span className="thinking-dot" style={{ animationDelay: '0ms' }} />
                  <span className="thinking-dot" style={{ animationDelay: '150ms' }} />
                  <span className="thinking-dot" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-line bg-card/60 backdrop-blur">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void ask(input)
              }}
              className="flex items-end gap-2 max-w-3xl mx-auto"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void ask(input)
                  }
                }}
                placeholder="Ask anything about your sources…"
                rows={1}
                aria-label="Chat message"
                className="flex-1 resize-none max-h-32 px-4 py-3 rounded-xl border border-line bg-card text-sm text-ink outline-none focus:border-lavender transition-colors"
              />
              <Button type="submit" size="lg" disabled={!input.trim() || thinking} aria-label="Send message">
                <Send size={16} aria-hidden="true" />
              </Button>
            </form>
            <p className="text-center text-[11px] text-muted mt-2">
              Enter to send · Shift + Enter for a new line
            </p>
          </div>
        </section>

        {/* RIGHT: tools */}
        <aside className="xl:w-60 shrink-0 border-t xl:border-t-0 xl:border-l border-line bg-sidebar/50 p-4 overflow-y-auto max-h-40 xl:max-h-none">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
            <Sparkles size={13} aria-hidden="true" /> Tools
          </h2>
          <div className="space-y-1.5">
            {tools.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => void ask(t.prompt)}
                disabled={thinking}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card border border-line text-sm text-ink hover:border-lavender/50 hover:bg-lavender-soft/40 hover:shadow-sm transition-all disabled:opacity-50 text-left"
              >
                <t.icon size={15} className="text-lavender shrink-0" aria-hidden="true" />
                {t.label}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
