import { useState, useRef, useEffect } from 'react'

const CATEGORY_COLORS = {
  Projects: '#D4A24C',
  Skills: '#5FC3B0',
  Certifications: '#E6BE72',
  Internships: '#3FA796',
  Achievements: '#D4A24C',
  Academics: '#5FC3B0'
}

export default function DocumentCard({ doc, categoryName, onOpen, onEdit, onDelete }) {
  const color = CATEGORY_COLORS[categoryName] || '#D4A24C'
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div
      className="doc-card relative block bg-parchment-200 text-ink-900 rounded-xl p-5 border border-transparent hover:border-gold-500/40 cursor-pointer"
      onClick={() => onOpen?.(doc)}
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full"
          style={{ background: `${color}22`, color }}
        >
          {categoryName || 'Uncategorized'}
        </span>
        <div className="flex items-center gap-2">
          {doc.event_year && <span className="text-xs text-ink-900/40 font-mono">{doc.event_year}</span>}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((v) => !v)
              }}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-ink-900/10 text-ink-900/50 hover:text-ink-900 leading-none"
              aria-label="Document options"
            >
              ⋮
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-7 z-10 w-32 bg-ink-800 border border-parchment-100/15 rounded-lg overflow-hidden shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    onEdit?.(doc)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-parchment-100/80 hover:bg-parchment-100/10"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete?.(doc)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <h3 className="font-display text-lg leading-snug mb-2">{doc.title}</h3>
      {doc.ai_summary && <p className="text-sm text-ink-900/60 leading-relaxed line-clamp-3">{doc.ai_summary}</p>}
      {doc.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {doc.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-[11px] bg-ink-900/5 text-ink-900/60 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}