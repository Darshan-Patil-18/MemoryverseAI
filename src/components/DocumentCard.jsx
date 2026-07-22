const CATEGORY_COLORS = {
  Projects: '#D4A24C',
  Skills: '#5FC3B0',
  Certifications: '#E6BE72',
  Internships: '#3FA796',
  Achievements: '#D4A24C',
  Academics: '#5FC3B0'
}

export default function DocumentCard({ doc, categoryName }) {
  const color = CATEGORY_COLORS[categoryName] || '#D4A24C'
  return (
    <a
      href={doc.file_url || '#'}
      target={doc.file_url ? '_blank' : undefined}
      rel="noreferrer"
      className="doc-card block bg-parchment-200 text-ink-900 rounded-xl p-5 border border-transparent hover:border-gold-500/40"
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full"
          style={{ background: `${color}22`, color }}
        >
          {categoryName || 'Uncategorized'}
        </span>
        {doc.event_year && <span className="text-xs text-ink-900/40 font-mono">{doc.event_year}</span>}
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
    </a>
  )
}
