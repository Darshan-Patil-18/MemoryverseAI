const PALETTE = ['#D4A24C', '#3FA796', '#5FC3B0', '#E6BE72', '#B4813A', '#2E8577']

function colorFromString(str) {
    let hash = 0
    for (let i = 0; i < (str || '').length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    return PALETTE[Math.abs(hash) % PALETTE.length]
}

export function GoogleLogoIcon({ size = 18, className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
    )
}

export function EmailLogoIcon({ size = 18, className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
        </svg>
    )
}

// Single piece of logic used everywhere a user's avatar is shown:
// - If signed up with Google: show Google photo or Google logo badge.
// - If signed up with Email: show deterministic letter-wise initial avatar circle.
export default function Avatar({ url, name, email, size = 40, className = '', provider = null, showBadge = true }) {
    const label = (name || email || '?').trim()
    const initial = label ? label[0].toUpperCase() : '?'
    const bg = colorFromString(label)
    const isGoogle = provider === 'google' || (url && url.includes('googleusercontent'))

    return (
        <div className="relative inline-flex flex-shrink-0 items-center justify-center" style={{ width: size, height: size }}>
            {url ? (
                <img
                    src={url}
                    alt={name || email || 'Profile photo'}
                    style={{ width: size, height: size }}
                    className={`rounded-full object-cover ${className}`}
                    onError={(e) => {
                        e.currentTarget.style.display = 'none'
                    }}
                />
            ) : isGoogle ? (
                <div
                    style={{ width: size, height: size, background: '#FFFFFF', border: '1px solid rgba(30,35,64,0.15)' }}
                    className={`rounded-full flex items-center justify-center shadow-sm ${className}`}
                >
                    <GoogleLogoIcon size={Math.round(size * 0.55)} />
                </div>
            ) : (
                <div
                    style={{ width: size, height: size, background: bg, fontSize: size * 0.42 }}
                    className={`rounded-full flex items-center justify-center text-ink-950 font-display font-medium ${className}`}
                >
                    {initial}
                </div>
            )}

            {showBadge && isGoogle && url && (
                <div
                    className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-sm border border-black/10 flex items-center justify-center"
                    style={{ width: Math.max(14, Math.round(size * 0.35)), height: Math.max(14, Math.round(size * 0.35)) }}
                    title="Signed in with Google"
                >
                    <GoogleLogoIcon size={Math.max(10, Math.round(size * 0.25))} />
                </div>
            )}
        </div>
    )
}