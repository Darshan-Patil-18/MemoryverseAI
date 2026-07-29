export default function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', danger = true, onConfirm, onCancel }) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-ink-950/70 backdrop-blur-sm" onClick={onCancel}>
            <div
                className="w-full max-w-sm bg-ink-800 border border-parchment-100/15 rounded-2xl p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="font-display text-lg text-parchment-100 mb-2">{title}</h3>
                <p className="text-sm text-parchment-100/60 mb-6 leading-relaxed">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="text-sm px-4 py-2 rounded-lg border border-parchment-100/15 text-parchment-100/70 hover:text-parchment-100 hover:border-parchment-100/30 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${danger ? 'bg-red-500/90 hover:bg-red-500 text-white' : 'bg-gold-500 hover:bg-gold-400 text-ink-950'
                            }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}