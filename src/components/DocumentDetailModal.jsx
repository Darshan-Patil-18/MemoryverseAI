const CATEGORY_COLORS = {
    Projects: '#D4A24C',
    Skills: '#5FC3B0',
    Certifications: '#E6BE72',
    Internships: '#3FA796',
    Achievements: '#D4A24C',
    Academics: '#5FC3B0'
}

function isImage(fileType) {
    return (fileType || '').startsWith('image/')
}
function isPdf(fileType) {
    return fileType === 'application/pdf'
}

export default function DocumentDetailModal({ doc, categoryName, relatedTitles, onClose, onEdit, onDelete }) {
    if (!doc) return null
    const color = CATEGORY_COLORS[categoryName] || '#D4A24C'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-ink-950/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-3xl max-h-full overflow-y-auto bg-ink-800 border border-parchment-100/15 rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-parchment-100/10">
                    <div>
                        <span
                            className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full"
                            style={{ background: `${color}22`, color }}
                        >
                            {categoryName || 'Uncategorized'}
                        </span>
                        <h2 className="font-display text-2xl text-parchment-100 mt-3">{doc.title}</h2>
                        {doc.event_year && <p className="text-xs text-parchment-100/50 font-mono mt-1">{doc.event_year}</p>}
                    </div>
                    <button onClick={onClose} className="text-parchment-100/50 hover:text-parchment-100 text-2xl leading-none mt-1 transition-colors">
                        ×
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 grid sm:grid-cols-2 gap-6">
                    {/* Left — Original File Preview */}
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-parchment-100/60 mb-2">Original file</p>
                        <div
                            className="rounded-xl overflow-hidden border border-parchment-100/15 bg-white/70 shadow-inner flex flex-col"
                            style={{ height: '460px' }}
                        >
                            {doc.file_url && isImage(doc.file_type) && (
                                <img
                                    src={doc.file_url}
                                    alt={doc.title}
                                    className="w-full h-full object-contain"
                                />
                            )}
                            {doc.file_url && isPdf(doc.file_type) && (
                                <iframe
                                    src={doc.file_url}
                                    title={doc.title}
                                    className="w-full h-full"
                                    style={{ border: 'none' }}
                                />
                            )}
                            {doc.file_url && !isImage(doc.file_type) && !isPdf(doc.file_type) && (
                                <div className="flex-1 flex items-center justify-center p-6">
                                    <a
                                        href={doc.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-gold-500 hover:text-gold-400 underline text-sm"
                                    >
                                        Open original file ({doc.original_filename})
                                    </a>
                                </div>
                            )}
                            {!doc.file_url && (
                                <div className="flex-1 flex items-center justify-center p-6">
                                    <p className="text-sm text-parchment-100/50 text-center">
                                        {doc.source_type === 'url'
                                            ? 'Project Link / URL — no file preview.'
                                            : 'No original file for this entry (written note).'}
                                    </p>
                                </div>
                            )}
                        </div>
                        {doc.file_url && (
                            <div className="flex gap-3 mt-3">
                                <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs text-gold-500 hover:text-gold-400 underline">
                                    Open original
                                </a>
                                {doc.source_type !== 'url' && (
                                    <a
                                        href={doc.file_url}
                                        download={doc.original_filename || doc.title}
                                        className="text-xs text-parchment-100/60 hover:text-parchment-100 underline"
                                    >
                                        Download file
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right — AI info */}
                    <div className="space-y-4">
                        {/* AI Summary */}
                        <div className="rounded-xl border border-slate-200/80 bg-white/60 shadow-sm p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">AI Summary</p>
                            <p className="text-sm text-slate-800 leading-relaxed">
                                {doc.ai_summary || <span className="text-slate-400 italic">No summary available.</span>}
                            </p>
                        </div>

                        {/* Tags */}
                        {doc.tags?.length > 0 && (
                            <div className="rounded-xl border border-slate-200/80 bg-white/60 shadow-sm p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2.5">Tags</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {doc.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                                            style={{ background: `${color}18`, color: color }}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Detected Relationships */}
                        <div className="rounded-xl border border-slate-200/80 bg-white/60 shadow-sm p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2.5">Detected Relationships</p>
                            {relatedTitles?.length > 0 ? (
                                <ul className="space-y-2">
                                    {relatedTitles.map((r, i) => (
                                        <li key={i} className="text-sm text-slate-800 flex items-start gap-2">
                                            <span
                                                className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                                                style={{ background: color }}
                                            />
                                            {r}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-slate-500 italic">
                                    No connections found yet — upload related items to link them.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-parchment-100/10">
                    <button
                        onClick={onDelete}
                        className="text-sm px-4 py-2 rounded-lg border border-red-300/60 text-red-500 hover:bg-red-50/80 transition-colors"
                    >
                        Delete
                    </button>
                    <button
                        onClick={onEdit}
                        className="text-sm px-4 py-2 rounded-lg bg-gold-500 hover:bg-gold-400 text-ink-950 font-medium transition-colors"
                    >
                        Edit
                    </button>
                </div>
            </div>
        </div>
    )
}
