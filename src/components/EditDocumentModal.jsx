import { useState } from 'react'

const CATEGORY_NAMES = ['Projects', 'Skills', 'Certifications', 'Internships', 'Achievements', 'Academics']

export default function EditDocumentModal({ doc, categories, onClose, onSave }) {
    const [title, setTitle] = useState(doc.title)
    const [categoryId, setCategoryId] = useState(doc.category_id)
    const [summary, setSummary] = useState(doc.ai_summary || '')
    const [tagsText, setTagsText] = useState((doc.tags || []).join(', '))
    const [eventYear, setEventYear] = useState(doc.event_year || new Date().getFullYear())
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        setSaving(true)
        const tags = tagsText
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        await onSave({
            title: title.trim(),
            category_id: categoryId,
            ai_summary: summary.trim(),
            tags,
            event_year: Number(eventYear) || null
        })
        setSaving(false)
    }

    const inputClass =
        'w-full bg-white/80 border border-slate-300/80 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 transition-colors'
    const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-ink-950/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-lg bg-ink-800 border border-parchment-100/15 rounded-2xl p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="font-display text-xl text-parchment-100 mb-1">Edit document</h3>
                <p className="text-sm text-slate-500 mb-6">Your corrections help MemoryVerse learn from now on.</p>

                <div className="space-y-4">
                    <div>
                        <label className={labelClass}>Title</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Category</label>
                            <select
                                value={categoryId || ''}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className={inputClass}
                            >
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Year</label>
                            <input
                                type="number"
                                value={eventYear}
                                onChange={(e) => setEventYear(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Summary</label>
                        <textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            rows={3}
                            className={inputClass + ' resize-none'}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Tags <span className="normal-case font-normal text-slate-400">(comma separated)</span></label>
                        <input
                            value={tagsText}
                            onChange={(e) => setTagsText(e.target.value)}
                            placeholder="python, machine learning, react"
                            className={inputClass}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="text-sm px-4 py-2 rounded-lg border border-slate-300/70 text-slate-600 hover:text-slate-800 hover:border-slate-400/70 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="text-sm px-5 py-2 rounded-lg bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-ink-950 font-medium transition-colors"
                    >
                        {saving ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </div>
        </div>
    )
}