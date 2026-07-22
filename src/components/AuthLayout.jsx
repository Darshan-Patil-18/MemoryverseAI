import { Link } from 'react-router-dom'
import { MarkLogo } from './icons'

const QUOTES = [
  {
    text: '"MemoryVerse found the connection between my Python certificate and my final-year project before I even labeled either one. That\'s the whole idea."',
    handle: '@a_student'
  },
  {
    text: '"Went from a drive full of random PDFs to an actual timeline of my last four years. Didn\'t expect that."',
    handle: '@dp_builds'
  }
]

export default function AuthLayout({ children, quoteIndex = 0 }) {
  const quote = QUOTES[quoteIndex % QUOTES.length]
  return (
    <div className="min-h-screen bg-ink-900 grid lg:grid-cols-2">
      <div className="flex flex-col px-6 sm:px-14 py-10">
        <Link to="/" className="flex items-center gap-2.5 mb-16">
          <MarkLogo className="w-8 h-8" />
          <span className="font-display text-lg text-parchment-100">MemoryVerse <span className="text-gold-500">AI</span></span>
        </Link>
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-sm mx-auto">{children}</div>
        </div>
      </div>
      <div className="hidden lg:flex relative bg-ink-950 items-center px-16">
        <div className="grain-overlay" />
        <blockquote className="relative z-10">
          <span className="text-5xl text-gold-500/40 font-display leading-none">&ldquo;</span>
          <p className="font-display text-2xl leading-snug text-parchment-100 mt-2">{quote.text.replace(/^"|"$/g, '')}</p>
          <footer className="mt-6 text-parchment-100/50 font-mono text-sm">{quote.handle}</footer>
        </blockquote>
      </div>
    </div>
  )
}
