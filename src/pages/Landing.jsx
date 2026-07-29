import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MarkLogo } from '../components/icons'

const NAV_TABS = [
  { id: 'overview', label: 'Product' },
  { id: 'modules', label: 'Solutions' },
  { id: 'journey', label: 'Timeline' },
  { id: 'questions', label: 'Company' }
]

const MODULES = [
  {
    n: 'Ingestion',
    title: 'Drop in everything, sorted or not',
    body: 'Certificates, resumes, project reports, internship letters, portfolio links — upload in whatever format you have them. Nothing needs a folder first.'
  },
  {
    n: 'Categorization',
    title: 'Sorted the moment it lands',
    body: 'Every file is read and placed into Projects, Skills, Certifications, Internships, Achievements, or Academics automatically — no dropdowns, no manual tagging.'
  },
  {
    n: 'Relationships',
    title: 'Sees how your journey connects',
    body: 'A Python certificate becomes a skill. That skill led to a project. That project became an internship. MemoryVerse draws the line between them.'
  },
  {
    n: 'Timeline',
    title: 'Your growth, laid out by year',
    body: '2023: Python certification. 2024: Club lead. 2025: Internship. 2026: AI portfolio. One continuous thread instead of scattered files.'
  },
  {
    n: 'Retrieval',
    title: 'Ask for it, get the original file',
    body: '"Show my AI projects." "Show my latest resume." Natural search over everything you\'ve stored, with the original document one click away.'
  }
]

const QUESTIONS = [
  { q: 'Can it organize itself?', a: 'No manual sorting. Upload and the system files it correctly, every time.' },
  { q: 'Can it connect the dots?', a: 'Skills, projects, certifications, and internships are linked automatically, not left as isolated files.' },
  { q: 'Can you find anything instantly?', a: 'Plain-language search replaces folder-diving. Ask, and the original file is there.' }
]

export default function Landing() {
  const [activeTab, setActiveTab] = useState('overview')
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 })
  const tabRefs = useRef({})
  const isClickScrolling = useRef(false)
  const clickTimeoutRef = useRef(null)

  // Update slider position whenever activeTab changes
  useEffect(() => {
    const currentEl = tabRefs.current[activeTab]
    if (currentEl) {
      setSliderStyle({
        left: currentEl.offsetLeft,
        width: currentEl.offsetWidth
      })
    }
  }, [activeTab])

  // Scroll spy to detect active section
  useEffect(() => {
    const handleScroll = () => {
      if (isClickScrolling.current) return
      const scrollPosition = window.scrollY + 200
      for (const tab of NAV_TABS) {
        const el = document.getElementById(tab.id)
        if (el) {
          const top = el.offsetTop
          const height = el.offsetHeight
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveTab(tab.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current)
    }
  }, [])

  const handleTabClick = (e, id) => {
    e.preventDefault()
    setActiveTab(id)
    isClickScrolling.current = true
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current)

    const target = document.getElementById(id)
    if (target) {
      const yOffset = -90
      const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: 'smooth' })
    }

    clickTimeoutRef.current = setTimeout(() => {
      isClickScrolling.current = false
    }, 750)
  }

  return (
    <div className="relative min-h-screen bg-ink-900 paper-texture overflow-x-clip">
      <div className="grain-overlay" />

      {/* Sticky Floating Glass Pill Nav Bar */}
      <div className="sticky top-4 z-50 flex justify-center px-4 mb-4">
        <header
          className="flex items-center justify-between gap-4 sm:gap-8 px-5 py-2.5 rounded-full transition-all"
          style={{
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(25px) saturate(180%)',
            WebkitBackdropFilter: 'blur(25px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.65)',
            boxShadow: '0 16px 36px -10px rgba(30, 35, 64, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
          }}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 pr-2">
            <MarkLogo className="w-7 h-7" />
            <span className="font-display text-base tracking-tight" style={{ color: '#1E2340' }}>
              MemoryVerse <span style={{ color: '#D4A24C' }}>AI</span>
            </span>
          </Link>

          {/* Pill Nav Items with Sliding Indicator */}
          <nav
            className="hidden md:flex relative items-center p-1 rounded-full"
            style={{ background: 'rgba(255, 255, 255, 0.25)', border: '1px solid rgba(255, 255, 255, 0.4)' }}
          >
            {/* Sliding Pill Background Indicator */}
            <div
              className="absolute top-1 bottom-1 rounded-full shadow-sm"
              style={{
                left: `${sliderStyle.left}px`,
                width: `${sliderStyle.width}px`,
                background: '#FFFFFF',
                transition: 'all 0.35s cubic-bezier(0.34, 1.25, 0.64, 1)'
              }}
            />

            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <a
                  key={tab.id}
                  ref={(el) => (tabRefs.current[tab.id] = el)}
                  href={`#${tab.id}`}
                  onClick={(e) => handleTabClick(e, tab.id)}
                  className="relative z-10 text-sm font-medium px-4 py-1.5 rounded-full transition-colors duration-200"
                  style={{
                    color: isActive ? '#1E2340' : 'rgba(30,35,64,0.75)'
                  }}
                >
                  {tab.label}
                </a>
              )
            })}
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Link
              to="/sign-in"
              className="hidden sm:inline-block text-xs font-semibold px-4 py-2 rounded-full transition-all"
              style={{ color: '#1E2340', background: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.4)'; }}
            >
              Sign in
            </Link>
            <Link
              to="/sign-up"
              className="text-xs font-semibold px-4 py-2 rounded-full transition-all shadow-md"
              style={{
                background: 'linear-gradient(135deg, #D4A24C, #E6BE72)',
                color: '#1E2340',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Get started
            </Link>
          </div>
        </header>
      </div>

      {/* Hero (#overview) */}
      <section id="overview" className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pt-16 sm:pt-24 pb-28">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-16 items-center">
          <div>
            <p className="font-mono text-xs tracking-[0.25em] uppercase text-thread-400 mb-6">Digital identity for your academic journey</p>
            <h1 className="font-display text-[2.75rem] sm:text-6xl lg:text-[4.2rem] leading-[1.04] tracking-tight text-parchment-100">
              Every certificate, project,
              <br className="hidden sm:block" />
              and internship —
              <br className="hidden sm:block" />
              <span className="text-gold-500 italic">finally one story.</span>
            </h1>
            <p className="mt-7 text-lg text-parchment-100/65 max-w-xl leading-relaxed">
              MemoryVerse AI reads what you upload, files it correctly, connects it to everything
              related, and lets you ask for any of it back in plain language. Stop searching
              through folders. Start seeing your own growth.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/sign-up" className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-medium px-7 py-3.5 rounded-full transition-colors">
                Start your archive
              </Link>
              <Link to="/sign-in" className="border border-parchment-100/20 hover:border-parchment-100/40 text-parchment-100 px-7 py-3.5 rounded-full transition-colors">
                Sign in
              </Link>
            </div>
            <p className="mt-6 text-sm text-parchment-100/40">No credit card. Your files stay yours, in their original format.</p>
          </div>

          {/* Signature element: the connecting thread */}
          <ThreadVisual />
        </div>
      </section>

      {/* Modules (#modules) */}
      <section id="modules" className="relative z-10 border-t border-parchment-100/10 bg-ink-950/40">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-24">
          <p className="font-mono text-xs tracking-[0.25em] uppercase text-thread-400 mb-4">How it works</p>
          <h2 className="font-display text-3xl sm:text-4xl text-parchment-100 max-w-2xl mb-16">Five modules, one continuous pipeline</h2>
          <div className="space-y-0">
            {MODULES.map((m, i) => (
              <div key={m.n} className={`grid sm:grid-cols-[140px_1fr] gap-6 sm:gap-10 py-9 ${i !== 0 ? 'border-t border-parchment-100/10' : ''}`}>
                <div className="font-display text-2xl text-gold-500/90">{m.n}</div>
                <div>
                  <h3 className="text-xl text-parchment-100 mb-2 font-medium">{m.title}</h3>
                  <p className="text-parchment-100/60 leading-relaxed max-w-2xl">{m.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey preview (#journey) */}
      <section id="journey" className="relative z-10 border-t border-parchment-100/10">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-24">
          <p className="font-mono text-xs tracking-[0.25em] uppercase text-thread-400 mb-4">Digital journey timeline</p>
          <h2 className="font-display text-3xl sm:text-4xl text-parchment-100 max-w-2xl mb-16">Four years, laid end to end</h2>
          <JourneyPreview />
        </div>
      </section>

      {/* Key questions (#questions / Company) */}
      <section id="questions" className="relative z-10 border-t border-parchment-100/10">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-24">
          <h2 className="font-display text-3xl sm:text-4xl text-parchment-100 max-w-2xl">
            Storage answers "where is it."<br />This answers "what does it mean."
          </h2>
          <div className="mt-14 grid sm:grid-cols-3 gap-8">
            {QUESTIONS.map((item) => (
              <div key={item.q} className="border-t border-gold-500/40 pt-6">
                <h3 className="font-display text-xl text-parchment-100 mb-3">{item.q}</h3>
                <p className="text-parchment-100/60 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t border-parchment-100/10">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-28 text-center">
          <h2 className="font-display text-3xl sm:text-5xl text-parchment-100 leading-tight">
            "I never have to search<br />through folders again."
          </h2>
          <p className="mt-6 text-parchment-100/60 max-w-lg mx-auto">
            That's the moment this is built for. Bring your first document and see it happen.
          </p>
          <Link to="/sign-up" className="mt-10 inline-block bg-gold-500 hover:bg-gold-400 text-ink-950 font-medium px-8 py-4 rounded-full transition-colors">
            Build your archive
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-parchment-100/10">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-parchment-100/40">
          <div className="flex items-center gap-2">
            <MarkLogo className="w-5 h-5" />
            <span>MemoryVerse AI</span>
          </div>
          <span>Built for the '26 Digital Identity Challenge.</span>
        </div>
      </footer>
    </div>
  )
}

function ThreadVisual() {
  const nodes = [
    { x: 40, y: 210, label: 'Certificate', year: '2023', color: '#D4A24C' },
    { x: 140, y: 120, label: 'Skill', year: '2023', color: '#5FC3B0' },
    { x: 230, y: 170, label: 'Project', year: '2024', color: '#D4A24C' },
    { x: 320, y: 70, label: 'Internship', year: '2025', color: '#5FC3B0' },
    { x: 380, y: 150, label: 'Portfolio', year: '2026', color: '#D4A24C' }
  ]
  const path = nodes.map((n) => `${n.x},${n.y}`).join(' L ')

  return (
    <div className="relative rounded-3xl border border-parchment-100/10 bg-ink-800/50 backdrop-blur-sm p-6 sm:p-8">
      <svg viewBox="0 0 420 260" className="w-full h-auto" role="img" aria-label="A connected timeline from certificate to portfolio">
        <path d={`M ${path}`} fill="none" stroke="#3FA796" strokeWidth="1.5" strokeDasharray="4 5" opacity="0.6" />
        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r="5" fill={n.color} />
            <circle cx={n.x} cy={n.y} r="10" fill={n.color} opacity="0.15" />
          </g>
        ))}
      </svg>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {nodes.map((n) => (
          <div key={n.label} className="flex items-center gap-2 text-xs text-parchment-100/60">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: n.color }} />
            {n.label} <span className="text-parchment-100/30">· {n.year}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function JourneyPreview() {
  const items = [
    { year: '2023', text: 'Python Certification', cat: 'Certifications' },
    { year: '2024', text: 'Data Science Club Lead', cat: 'Achievements' },
    { year: '2025', text: 'Internship at a data-analytics startup', cat: 'Internships' },
    { year: '2026', text: 'AI/ML Project Portfolio', cat: 'Projects' }
  ]
  return (
    <div className="relative pl-8 sm:pl-0">
      <div className="hidden sm:block absolute left-0 right-0 top-[38px] h-px thread-line" />
      <div className="sm:hidden absolute left-3 top-0 bottom-0 w-px thread-line" />
      <div className="grid sm:grid-cols-4 gap-10 sm:gap-6">
        {items.map((it) => (
          <div key={it.year} className="relative">
            <div className="hidden sm:flex w-3 h-3 rounded-full bg-gold-500 mb-6 relative z-10" />
            <div className="sm:hidden absolute -left-8 top-1.5 w-3 h-3 rounded-full bg-gold-500" />
            <p className="font-display text-2xl text-parchment-100 mb-1">{it.year}</p>
            <p className="text-parchment-100/70 text-sm leading-relaxed">{it.text}</p>
            <span className="inline-block mt-2 text-[11px] font-mono uppercase tracking-wider text-thread-400">{it.cat}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
