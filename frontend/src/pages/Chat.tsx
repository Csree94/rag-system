import { useRef, useState } from 'react'
import {
  BookmarkPlus,
  ClipboardCopy,
  FileText,
  MessageSquareText,
  RotateCcw,
  Send,
  Sparkles,
} from 'lucide-react'
import Button from '../components/common/Button'
import EmptyState from '../components/common/EmptyState'
import { askQuestion, saveAnswer } from '../services/api'
import type { ChatResponse } from '../services/api'

interface ChatMsg {
  role: 'user' | 'assistant'
  text: string
  sources?: ChatResponse['sources']
  foundContext?: boolean
  model?: string
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [savedIdx, setSavedIdx] = useState<Set<number>>(new Set())
  const endRef = useRef<HTMLDivElement>(null)

  const scrollDown = () => requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }))

  async function ask(question: string) {
    if (!question.trim() || thinking) return
    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setInput('')
    setThinking(true)
    scrollDown()
    try {
      const res = await askQuestion(question)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: res.answer, sources: res.sources, foundContext: res.found_context, model: res.model },
      ])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: e instanceof Error ? e.message : 'The AI request failed. Please try again.', foundContext: false },
      ])
    } finally {
      setThinking(false)
      scrollDown()
    }
  }

  function handleSave(idx: number) {
    const msg = messages[idx]
    const question = messages[idx - 1]?.text ?? ''
    void saveAnswer(question, msg.text, msg.sources ?? [], null)
    setSavedIdx((prev) => new Set(prev).add(idx))
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 lg:px-8 h-14 border-b border-line bg-card/50 backdrop-blur shrink-0">
        <span className="h-8 w-8 rounded-xl bg-lavender text-white flex items-center justify-center text-sm" aria-hidden="true">✦</span>
        <div>
          <h1 className="font-semibold text-ink text-sm">AI Chat</h1>
          <p className="text-[11px] text-muted">Grounded in all your indexed documents</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.length === 0 && (
            <EmptyState
              icon={<MessageSquareText size={30} aria-hidden="true" />}
              title="Ask anything about your documents"
              description="Upload documents first, then ask questions. Every answer cites the chunks it was grounded in."
            />
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 anim-fade-up ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && (
                <span className="h-8 w-8 rounded-xl bg-lavender text-white flex items-center justify-center text-xs shrink-0" aria-hidden="true">✦</span>
              )}
              <div className="max-w-[85%] md:max-w-[75%]">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-lavender text-white rounded-br-md'
                      : 'bg-card border border-line text-ink rounded-tl-md'
                  }`}
                >
                  {m.text}
                </div>

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
                  </div>
                )}

                {m.role === 'assistant' && m.foundContext === false && (
                  <p className="text-xs text-sun mt-1.5">No relevant context was found in your indexed documents.</p>
                )}

                {m.role === 'assistant' && i >= 1 && (
                  <div className="flex gap-3 mt-2.5">
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard.writeText(m.text)}
                      className="text-xs text-muted hover:text-ink inline-flex items-center gap-1 transition-colors"
                    >
                      <ClipboardCopy size={12} aria-hidden="true" /> Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSave(i)}
                      disabled={savedIdx.has(i)}
                      className="text-xs text-muted hover:text-lavender-deep inline-flex items-center gap-1 transition-colors disabled:text-mint disabled:hover:text-mint"
                    >
                      <BookmarkPlus size={12} aria-hidden="true" /> {savedIdx.has(i) ? 'Saved' : 'Save answer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void ask(messages[i - 1]?.text ?? '')}
                      className="text-xs text-muted hover:text-ink inline-flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw size={12} aria-hidden="true" /> Regenerate
                    </button>
                  </div>
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
          <div ref={endRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-line bg-card/60 backdrop-blur shrink-0">
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
        <p className="text-center text-[11px] text-muted mt-2 flex items-center justify-center gap-1">
          <Sparkles size={11} aria-hidden="true" /> Answers are generated only from your indexed documents
        </p>
      </div>
    </div>
  )
}
