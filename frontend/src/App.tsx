import { useState } from 'react'
import './App.css'
import Signup from './pages/Signup'

type IconName = 'chat' | 'doc' | 'quote' | 'lock' | 'check' | 'sparkle'

/** Small inline SVG icons (no icon library needed). */
function Icon({ name }: { name: IconName }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (name) {
    case 'chat':
      return (
        <svg {...common}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      )
    case 'doc':
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M9 13h6M9 17h6" />
        </svg>
      )
    case 'quote':
      return (
        <svg {...common}>
          <path d="M12 21a9 9 0 1 1 9-9c0 2.5-2 4-4 4h-2a2 2 0 0 0-2 2c0 1.5 1 2 1 2s-2-.5-2-1z" />
          <circle cx="8.5" cy="10.5" r="0.5" fill="currentColor" />
          <circle cx="12" cy="7.5" r="0.5" fill="currentColor" />
          <circle cx="15.5" cy="10.5" r="0.5" fill="currentColor" />
        </svg>
      )
    case 'lock':
      return (
        <svg {...common}>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      )
    case 'check':
      return (
        <svg {...common}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )
    case 'sparkle':
      return (
        <svg {...common}>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
        </svg>
      )
  }
}

/** Product mock shown on the right of the hero: documents on the left, Q&A on the right. */
function HeroMock() {
  return (
    <div className="mock" aria-hidden="true">
      <div className="mock-window">
        <div className="mock-bar">
          <span />
          <span />
          <span />
        </div>

        <div className="mock-body">
          <div className="mock-col mock-docs">
            <p className="mock-col-title">Documents</p>

            <div className="mock-file mock-file-active">
              <Icon name="doc" />
              <div>
                <p className="mock-file-name">quarterly-report.pdf</p>
                <p className="mock-file-meta">PDF · 24 pages</p>
              </div>
            </div>

            <div className="mock-file">
              <Icon name="doc" />
              <div>
                <p className="mock-file-name">research-notes.docx</p>
                <p className="mock-file-meta">DOCX · 12 pages</p>
              </div>
            </div>

            <div className="mock-file">
              <Icon name="doc" />
              <div>
                <p className="mock-file-name">meeting-transcript.txt</p>
                <p className="mock-file-meta">TXT · 8 pages</p>
              </div>
            </div>
          </div>

          <div className="mock-col mock-chat">
            <p className="mock-col-title">Chat</p>

            <div className="mock-bubble mock-question">
              What were the Q3 revenue highlights?
            </div>

            <div className="mock-bubble mock-answer">
              <p>
                Q3 revenue grew <strong>18%</strong> quarter-over-quarter,
                driven mainly by enterprise subscriptions.
              </p>
              <span className="mock-cite">quarterly-report.pdf · p.4</span>
            </div>

            <div className="mock-input">Ask a question…</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  // TEMPORARY page switch for testing the Signup UI (no routing library yet).
  // To revert: remove this state + early return + the three onClick handlers below.
  const [view, setView] = useState<'home' | 'signup'>('home')

  if (view === 'signup') {
    return <Signup onBack={() => setView('home')} />
  }

  const goToSignup = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setView('signup')
  }

  return (
    <div className="page">
      {/* ---------- Header ---------- */}
      <header className="header">
        <div className="container header-inner">
          <a href="#" className="logo">
            <span className="logo-mark" aria-hidden="true">
              <Icon name="sparkle" />
            </span>
            RAG System
          </a>

          <nav className="nav" aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#cta">Docs</a>
          </nav>

          <div className="header-actions">
            <a href="#" className="btn btn-ghost">
              Log In
            </a>
            <a href="#" className="btn btn-primary" onClick={goToSignup}>
              Get Started
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ---------- Hero ---------- */}
        <section className="hero">
          <div className="container hero-inner">
            <div className="hero-copy">
              <p className="hero-badge">
                <span aria-hidden="true">✦</span> AI-powered document chat
              </p>

              <h1>
                Chat with your documents using AI
              </h1>

              <p className="hero-subtitle">
                Upload your PDFs, reports, and notes, then ask questions in
                plain language. Every answer is grounded in your own content —
                with citations you can verify.
              </p>

              <div className="hero-ctas">
                <a href="#" className="btn btn-primary btn-lg" onClick={goToSignup}>
                  Get Started
                </a>
                <a href="#" className="btn btn-outline btn-lg">
                  Log In
                </a>
              </div>

              <p className="hero-note">No credit card required</p>
            </div>

            <HeroMock />
          </div>
        </section>

        {/* ---------- How it works (short 3-step strip) ---------- */}
        <section className="section steps" id="how-it-works">
          <div className="container">
            <div className="steps-grid">
              <div className="step">
                <span className="step-num">1</span>
                <div>
                  <h3>Upload documents</h3>
                  <p>Add PDFs, Word files, or text documents to your library.</p>
                </div>
              </div>
              <div className="step">
                <span className="step-num">2</span>
                <div>
                  <h3>We index your content</h3>
                  <p>Documents are parsed and embedded for fast retrieval.</p>
                </div>
              </div>
              <div className="step">
                <span className="step-num">3</span>
                <div>
                  <h3>Ask anything</h3>
                  <p>Get accurate answers with citations back to your sources.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section className="section features" id="features">
          <div className="container">
            <div className="section-head">
              <h2>Everything you need to work with documents</h2>
              <p>
                Purpose-built for understanding large collections of documents
                without reading every page.
              </p>
            </div>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <Icon name="chat" />
                </div>
                <h3>Ask Questions</h3>
                <p>
                  Ask in plain language and get instant answers from across all
                  your uploaded documents.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Icon name="quote" />
                </div>
                <h3>Grounded Answers</h3>
                <p>
                  Responses are generated only from your content, with citations
                  so you can verify every claim.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Icon name="doc" />
                </div>
                <h3>Multiple Formats</h3>
                <p>
                  Upload PDFs, Word documents, and text files — we parse and
                  index them automatically.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Icon name="lock" />
                </div>
                <h3>Secure Access</h3>
                <p>
                  Your account and documents are protected with authenticated,
                  private workspaces.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Bottom CTA ---------- */}
        <section className="section cta" id="cta">
          <div className="container">
            <div className="cta-card">
              <h2>Start asking your documents questions today</h2>
              <p>
                Upload your first document and see grounded answers in seconds.
              </p>
              <div className="cta-actions">
                <a href="#" className="btn btn-inverse btn-lg" onClick={goToSignup}>
                  Get Started — It&apos;s Free
                </a>
              </div>
              <ul className="cta-perks">
                <li>
                  <Icon name="check" /> Free to try
                </li>
                <li>
                  <Icon name="check" /> No setup required
                </li>
                <li>
                  <Icon name="check" /> Cancel anytime
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <a href="#" className="logo">
              <span className="logo-mark" aria-hidden="true">
                <Icon name="sparkle" />
              </span>
              RAG System
            </a>
            <p>Chat with your documents using AI.</p>
          </div>

          <nav className="footer-links" aria-label="Footer navigation">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </nav>
        </div>

        <div className="container footer-copy">
          <p>© {new Date().getFullYear()} RAG System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
