import { useState } from 'react'
import {
  BarChart3,
  Brain,
  ClipboardCopy,
  FileSearch,
  HelpCircle,
  ListChecks,
  Loader2,
  Sparkles,
  Target,
} from 'lucide-react'
import ErrorState from '../components/common/ErrorState'
import { askQuestion } from '../services/api'

interface InsightTool {
  id: string
  title: string
  description: string
  icon: typeof Sparkles
  chip: string
  prompt: string
}

const tools: InsightTool[] = [
  { id: 'summary', title: 'Summary', description: 'A concise overview of your indexed documents.', icon: Sparkles, chip: 'bg-lavender-soft text-lavender-deep', prompt: 'Provide a concise summary of the key points across my indexed documents.' },
  { id: 'concepts', title: 'Key Concepts', description: 'The most important ideas and definitions found in your sources.', icon: Brain, chip: 'bg-coral-soft text-coral-deep', prompt: 'Explain the key concepts found in my indexed documents.' },
  { id: 'faq', title: 'Frequently Asked Questions', description: 'Common questions your sources answer, with brief answers.', icon: HelpCircle, chip: 'bg-sun-soft text-ink', prompt: 'List frequently asked questions about my indexed documents, with brief answers.' },
  { id: 'guide', title: 'Study Guide', description: 'A structured guide to help you learn the material.', icon: ListChecks, chip: 'bg-mint-soft text-mint', prompt: 'Create a study guide from my indexed documents.' },
  { id: 'quiz', title: 'Quiz', description: 'Test yourself with questions generated from your sources.', icon: Target, chip: 'bg-lavender-soft text-lavender-deep', prompt: 'Create a short quiz based on my indexed documents.' },
  { id: 'topics', title: 'Important Topics', description: 'The topics that appear most prominently across documents.', icon: FileSearch, chip: 'bg-sun-soft text-ink', prompt: 'List the most important topics across my indexed documents.' },
  { id: 'analysis', title: 'Document Analysis', description: 'A high-level analysis of themes, tone and structure.', icon: BarChart3, chip: 'bg-mint-soft text-mint', prompt: 'Provide a high-level analysis of my indexed documents: themes, tone and structure.' },
]

type Results = Record<string, { text: string; loading: boolean; error: string | null; empty: boolean }>

export default function Insights() {
  const [results, setResults] = useState<Results>({})
  const [docError, setDocError] = useState<string | null>(null)

  async function generate(tool: InsightTool) {
    setDocError(null)
    setResults((prev) => ({ ...prev, [tool.id]: { text: '', loading: true, error: null, empty: false } }))
    try {
      const res = await askQuestion(tool.prompt)
      if (!res.found_context) {
        setResults((prev) => ({ ...prev, [tool.id]: { text: '', loading: false, error: null, empty: true } }))
      } else {
        setResults((prev) => ({ ...prev, [tool.id]: { text: res.answer, loading: false, error: null, empty: false } }))
      }
    } catch (e) {
      setResults((prev) => ({
        ...prev,
        [tool.id]: { text: '', loading: false, error: e instanceof Error ? e.message : 'Generation failed', empty: false },
      }))
    }
  }

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="anim-fade-up">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">AI Insights ✨</h1>
        <p className="text-sm text-muted mt-0.5">
          Generate summaries, study guides and more from your indexed documents.
        </p>
      </div>

      {docError && <ErrorState message={docError} />}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {tools.map((tool, i) => {
          const r = results[tool.id]
          return (
            <div
              key={tool.id}
              className="bg-card rounded-2xl border border-line p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col anim-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${tool.chip}`}>
                  <tool.icon size={18} aria-hidden="true" />
                </span>
                <h2 className="font-semibold text-ink">{tool.title}</h2>
              </div>
              <p className="text-sm text-muted mb-4">{tool.description}</p>

              {/* Result area */}
              <div className="flex-1 min-h-[80px]">
                {r?.loading ? (
                  <div className="flex items-center gap-2 text-sm text-lavender-deep py-3" role="status">
                    <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Generating…
                  </div>
                ) : r?.error ? (
                  <ErrorState message={r.error} onRetry={() => void generate(tool)} />
                ) : r?.empty ? (
                  <p className="text-xs text-sun bg-sun-soft rounded-xl px-3 py-2.5">
                    No indexed documents yet — upload documents first.
                  </p>
                ) : r?.text ? (
                  <div className="text-sm text-ink/90 whitespace-pre-wrap leading-relaxed bg-cream/60 rounded-xl p-3.5 max-h-56 overflow-y-auto">
                    {r.text}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => void generate(tool)}
                  disabled={r?.loading}
                  className="flex-1 h-9 rounded-xl bg-lavender text-white text-sm font-medium hover:bg-lavender-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {r?.text ? 'Regenerate' : 'Generate'}
                </button>
                {r?.text && (
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(r.text)}
                    className="h-9 px-3 rounded-xl border border-line text-muted hover:text-ink hover:bg-cream transition-colors"
                    aria-label={`Copy ${tool.title}`}
                  >
                    <ClipboardCopy size={14} className="inline" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {Object.keys(results).length === 0 && (
        <div className="bg-card rounded-2xl border border-dashed border-line py-10 px-6 text-center anim-fade-up">
          <Sparkles size={26} className="mx-auto text-sun mb-3" aria-hidden="true" />
          <p className="text-sm text-muted max-w-md mx-auto">
            Pick any card above — the insight is generated live from your indexed documents with the same RAG pipeline
            used for chat.
          </p>
        </div>
      )}
    </div>
  )
}
