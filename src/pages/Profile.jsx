import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { generateProfileSummary } from '../lib/ai'
import { countTagConnections } from '../lib/tagGraph'
import AppShell from '../components/AppShell'
import Avatar, { GoogleLogoIcon, EmailLogoIcon } from '../components/Avatar'
import ConfirmModal from '../components/ConfirmModal'

const SECTIONS = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'account', label: 'Account', icon: '⚙️' },
    { id: 'data', label: 'Your Data', icon: '💾' },
]

export default function Profile() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [profile, setProfile] = useState(null)
    const [fullName, setFullName] = useState('')
    const [bio, setBio] = useState('')
    const [githubUrl, setGithubUrl] = useState('')
    const [linkedinUrl, setLinkedinUrl] = useState('')
    const [stats, setStats] = useState({ documents: 0, connections: 0 })
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [generatedProfile, setGeneratedProfile] = useState('')
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [activeSection, setActiveSection] = useState('profile')

    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
    const authedName = user?.user_metadata?.full_name || user?.user_metadata?.name

    useEffect(() => {
        if (!user) return
        async function load() {
            const [{ data: p }, { data: docs }] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', user.id).single(),
                supabase.from('documents').select('id, tags').eq('user_id', user.id),
            ])
            setProfile(p)
            setFullName(p?.full_name || authedName || '')
            setBio(p?.bio || '')
            setGithubUrl(p?.github_url || '')
            setLinkedinUrl(p?.linkedin_url || '')
            setStats({ documents: (docs || []).length, connections: countTagConnections(docs || []) })
        }
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])

    async function handleSave() {
        setSaving(true)
        setSaved(false)
        await supabase
            .from('profiles')
            .update({
                full_name: fullName,
                bio,
                github_url: githubUrl,
                linkedin_url: linkedinUrl,
            })
            .eq('id', user.id)
        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    async function handleSuggestBio() {
        setGenerating(true)
        try {
            const { data: docs } = await supabase.from('documents').select('title, ai_summary, tags').eq('user_id', user.id).limit(20)
            const highlights = (docs || []).map((d) => d.title).slice(0, 6).join(', ')
            setBio(highlights ? `Building a journey around ${highlights}.` : 'Just getting started with MemoryVerse.')
        } finally {
            setGenerating(false)
        }
    }

    async function handleGenerateProfile() {
        setGenerating(true)
        try {
            const [{ data: docs }, { data: cats }] = await Promise.all([
                supabase.from('documents').select('*').eq('user_id', user.id),
                supabase.from('categories').select('*')
            ])
            const catMap = {}
                ; (cats || []).forEach((c) => (catMap[c.id] = c.name))
            const enriched = (docs || []).map((d) => ({ ...d, categoryName: catMap[d.category_id] }))
            const summary = await generateProfileSummary({ fullName, documents: enriched })
            setGeneratedProfile(summary)
        } catch (err) {
            console.error(err)
            setGeneratedProfile('Could not generate a profile summary right now — try again in a moment.')
        } finally {
            setGenerating(false)
        }
    }

    function downloadGeneratedProfile() {
        const blob = new Blob([generatedProfile], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${(fullName || 'profile').replace(/\s+/g, '_')}_summary.txt`
        a.click()
        URL.revokeObjectURL(url)
    }

    async function handleExportData() {
        const [{ data: docs }, { data: events }, { data: rels }] = await Promise.all([
            supabase.from('documents').select('*').eq('user_id', user.id),
            supabase.from('timeline_events').select('*').eq('user_id', user.id),
            supabase.from('relationships').select('*').eq('user_id', user.id)
        ])
        const payload = { profile, documents: docs, timeline_events: events, relationships: rels }
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'memoryverse_export.json'
        a.click()
        URL.revokeObjectURL(url)
    }

    async function handleDeleteAllData() {
        await supabase.from('relationships').delete().eq('user_id', user.id)
        await supabase.from('timeline_events').delete().eq('user_id', user.id)
        await supabase.from('documents').delete().eq('user_id', user.id)
        setConfirmDelete(false)
        setStats({ documents: 0, connections: 0 })
        navigate('/dashboard')
    }

    return (
        <AppShell>
            {/* Blurred backdrop overlay */}
            <div
                className="fixed inset-0 z-10"
                style={{
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    background: 'rgba(20, 22, 40, 0.35)',
                    pointerEvents: 'none',
                }}
            />

            {/* Settings modal card */}
            <div className="fixed inset-0 z-20 flex items-center justify-center p-4 sm:p-8">
                <div
                    className="w-full max-w-4xl animate-pop-in"
                    style={{
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.6) 100%)',
                        backdropFilter: 'blur(40px) saturate(200%)',
                        WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                        borderRadius: '24px',
                        border: '1px solid rgba(255,255,255,0.75)',
                        boxShadow: '0 40px 80px -20px rgba(20,22,40,0.45), 0 0 0 1px rgba(255,255,255,0.5) inset, 0 2px 0 rgba(255,255,255,0.9) inset',
                        transform: 'perspective(1200px) rotateX(0.4deg)',
                        height: '560px',
                        maxHeight: '88vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* Modal header */}
                    <div
                        style={{
                            padding: '20px 24px 16px',
                            borderBottom: '1px solid rgba(30,35,64,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexShrink: 0,
                        }}
                    >
                        <h1 style={{ fontSize: '17px', fontWeight: 600, color: '#1E2340', margin: 0 }}>Profile &amp; Settings</h1>
                        <button
                            onClick={() => navigate(-1)}
                            style={{
                                width: 28, height: 28, borderRadius: '50%',
                                border: '1px solid rgba(30,35,64,0.15)',
                                background: 'rgba(30,35,64,0.06)',
                                color: 'rgba(30,35,64,0.6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', fontSize: 16, lineHeight: 1,
                                transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,35,64,0.12)'; e.currentTarget.style.color = '#1E2340'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,35,64,0.06)'; e.currentTarget.style.color = 'rgba(30,35,64,0.6)'; }}
                        >
                            ×
                        </button>
                    </div>

                    {/* Modal body: left nav + right content */}
                    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                        {/* Left nav */}
                        <div
                            style={{
                                width: 200,
                                flexShrink: 0,
                                padding: '16px 12px',
                                borderRight: '1px solid rgba(30,35,64,0.08)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                            }}
                        >
                            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(30,35,64,0.4)', textTransform: 'uppercase', margin: '0 0 8px 8px' }}>Settings</p>
                            {SECTIONS.map(sec => (
                                <button
                                    key={sec.id}
                                    onClick={() => setActiveSection(sec.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '8px 10px',
                                        borderRadius: 10,
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: 14,
                                        fontWeight: activeSection === sec.id ? 600 : 400,
                                        textAlign: 'left',
                                        transition: 'all 0.15s ease',
                                        background: activeSection === sec.id
                                            ? 'linear-gradient(135deg, rgba(124,140,255,0.2), rgba(192,132,245,0.18))'
                                            : 'transparent',
                                        color: activeSection === sec.id ? '#1E2340' : 'rgba(30,35,64,0.65)',
                                        boxShadow: activeSection === sec.id ? '0 1px 4px rgba(124,140,255,0.15)' : 'none',
                                    }}
                                    onMouseEnter={e => {
                                        if (activeSection !== sec.id) {
                                            e.currentTarget.style.background = 'rgba(30,35,64,0.07)'
                                            e.currentTarget.style.color = '#1E2340'
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (activeSection !== sec.id) {
                                            e.currentTarget.style.background = 'transparent'
                                            e.currentTarget.style.color = 'rgba(30,35,64,0.65)'
                                        }
                                    }}
                                >
                                    <span style={{ fontSize: 15 }}>{sec.icon}</span>
                                    {sec.label}
                                </button>
                            ))}
                        </div>

                        {/* Right content */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
                            {activeSection === 'profile' && (
                                <ProfileSection
                                    user={user}
                                    avatarUrl={avatarUrl}
                                    fullName={fullName}
                                    setFullName={setFullName}
                                    bio={bio}
                                    setBio={setBio}
                                    githubUrl={githubUrl}
                                    setGithubUrl={setGithubUrl}
                                    linkedinUrl={linkedinUrl}
                                    setLinkedinUrl={setLinkedinUrl}
                                    profile={profile}
                                    stats={stats}
                                    saving={saving}
                                    saved={saved}
                                    generating={generating}
                                    generatedProfile={generatedProfile}
                                    handleSave={handleSave}
                                    handleSuggestBio={handleSuggestBio}
                                    handleGenerateProfile={handleGenerateProfile}
                                    downloadGeneratedProfile={downloadGeneratedProfile}
                                />
                            )}
                            {activeSection === 'account' && (
                                <AccountSection user={user} fullName={fullName} />
                            )}
                            {activeSection === 'data' && (
                                <DataSection
                                    handleExportData={handleExportData}
                                    onDeleteRequest={() => setConfirmDelete(true)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                open={confirmDelete}
                title="Delete all data?"
                message="This permanently deletes every document, timeline event, and connection in your archive. This cannot be undone."
                confirmLabel="Delete everything"
                onConfirm={handleDeleteAllData}
                onCancel={() => setConfirmDelete(false)}
            />
        </AppShell>
    )
}

/* ─────────── Profile section ─────────── */
function ProfileSection({
    user, avatarUrl, fullName, setFullName, bio, setBio,
    githubUrl, setGithubUrl, linkedinUrl, setLinkedinUrl,
    profile, stats, saving, saved, generating, generatedProfile,
    handleSave, handleSuggestBio, handleGenerateProfile, downloadGeneratedProfile
}) {
    const isGoogle = user?.app_metadata?.provider === 'google' || (avatarUrl && avatarUrl.includes('googleusercontent'))

    return (
        <div>
            {/* Avatar + name row */}
            <div style={{ display: 'flex', itemsCenter: 'center', gap: 16, marginBottom: 28 }}>
                <div style={{ position: 'relative' }}>
                    <Avatar url={avatarUrl} name={fullName} email={user?.email} provider={user?.app_metadata?.provider} size={64} />
                    {/* subtle ring */}
                    <div style={{
                        position: 'absolute', inset: -3, borderRadius: '50%',
                        border: '2px solid rgba(124,140,255,0.35)',
                        pointerEvents: 'none',
                    }} />
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <p style={{ fontSize: 18, fontWeight: 700, color: '#1E2340', margin: 0 }}>{fullName || user?.email}</p>
                        {isGoogle ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: '#FFFFFF', border: '1px solid rgba(30,35,64,0.12)', fontSize: 11, fontWeight: 600, color: '#1E2340' }}>
                                <GoogleLogoIcon size={12} /> Google
                            </span>
                        ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: 'rgba(124,140,255,0.15)', border: '1px solid rgba(124,140,255,0.25)', fontSize: 11, fontWeight: 600, color: '#1E2340' }}>
                                <EmailLogoIcon size={12} /> Email
                            </span>
                        )}
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(30,35,64,0.45)', margin: '4px 0 0' }}>
                        {isGoogle ? 'Signed in via Google OAuth' : 'Signed in via Email & Password'}
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
                {[
                    { label: 'Documents', value: stats.documents },
                    { label: 'Connections', value: stats.connections },
                    { label: 'Member since', value: profile?.created_at ? new Date(profile.created_at).getFullYear() : '—' },
                ].map(({ label, value }) => (
                    <div
                        key={label}
                        style={{
                            background: 'rgba(255,255,255,0.6)',
                            border: '1px solid rgba(255,255,255,0.75)',
                            borderRadius: 14,
                            padding: '14px 16px',
                            textAlign: 'center',
                            boxShadow: '0 2px 8px rgba(30,35,64,0.06)',
                        }}
                    >
                        <p style={{ fontSize: 24, fontWeight: 700, color: '#1E2340', margin: 0 }}>{value}</p>
                        <p style={{ fontSize: 11, color: 'rgba(30,35,64,0.45)', margin: '3px 0 0' }}>{label}</p>
                    </div>
                ))}
            </div>

            {/* Basic info */}
            <SectionLabel>Basic Info</SectionLabel>

            <SettingsField label="Display name">
                <SettingsInput value={fullName} onChange={e => setFullName(e.target.value)} />
            </SettingsField>

            <SettingsField label="Email">
                <SettingsInput value={user?.email || ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            </SettingsField>

            <SettingsField label="Bio / tagline">
                <div style={{ display: 'flex', gap: 8 }}>
                    <textarea
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        rows={2}
                        style={{ ...inputStyle, resize: 'none', flex: 1 }}
                    />
                    <button
                        onClick={handleSuggestBio}
                        disabled={generating}
                        style={ghostBtnStyle}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,35,64,0.1)'; e.currentTarget.style.color = '#1E2340'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,35,64,0.05)'; e.currentTarget.style.color = 'rgba(30,35,64,0.65)'; }}
                    >
                        AI suggest
                    </button>
                </div>
            </SettingsField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <SettingsField label="GitHub">
                    <SettingsInput value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/you" />
                </SettingsField>
                <SettingsField label="LinkedIn">
                    <SettingsInput value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/you" />
                </SettingsField>
            </div>

            <button
                onClick={handleSave}
                disabled={saving}
                style={{
                    width: '100%',
                    padding: '11px 0',
                    borderRadius: 12,
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                    fontWeight: 600,
                    fontSize: 14,
                    color: '#1E2340',
                    background: saved
                        ? 'linear-gradient(135deg, rgba(95,195,176,0.35), rgba(63,167,150,0.3))'
                        : 'linear-gradient(135deg, #D4A24C, #E6BE72)',
                    boxShadow: '0 4px 14px rgba(212,162,76,0.35)',
                    transition: 'all 0.2s ease',
                    marginTop: 24,
                    marginBottom: 8,
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
                {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
            </button>

            {/* Generate profile */}
            <div style={{ marginTop: 28 }}>
                <SectionLabel>Generate My Profile</SectionLabel>
                <p style={{ fontSize: 13, color: 'rgba(30,35,64,0.5)', marginBottom: 12 }}>
                    Turn everything you've uploaded into a one-page profile summary.
                </p>
                <button
                    onClick={handleGenerateProfile}
                    disabled={generating}
                    style={{
                        ...ghostBtnStyle,
                        padding: '9px 18px',
                        background: 'linear-gradient(135deg, rgba(95,195,176,0.2), rgba(63,167,150,0.15))',
                        border: '1px solid rgba(95,195,176,0.35)',
                        color: '#1E2340',
                        opacity: generating ? 0.6 : 1,
                    }}
                    onMouseEnter={e => { if (!generating) e.currentTarget.style.background = 'linear-gradient(135deg, rgba(95,195,176,0.3), rgba(63,167,150,0.25))'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(95,195,176,0.2), rgba(63,167,150,0.15))'; }}
                >
                    {generating ? 'Generating…' : 'Generate my profile'}
                </button>

                {generatedProfile && (
                    <div style={{
                        marginTop: 14,
                        background: 'rgba(255,255,255,0.55)',
                        border: '1px solid rgba(30,35,64,0.1)',
                        borderRadius: 14,
                        padding: 16,
                    }}>
                        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'rgba(30,35,64,0.8)', fontFamily: 'inherit', lineHeight: 1.6, margin: 0 }}>{generatedProfile}</pre>
                        <div style={{ marginTop: 10, display: 'flex', gap: 16 }}>
                            <button onClick={downloadGeneratedProfile} style={{ fontSize: 12, color: '#D4A24C', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                                Download as .txt
                            </button>
                            <button onClick={handleSave} style={{ fontSize: 12, color: '#D4A24C', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                                Save changes
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

/* ─────────── Account section ─────────── */
function AccountSection({ user, fullName }) {
    const isGoogle = user?.app_metadata?.provider === 'google'
    return (
        <div>
            <SectionLabel>Account Details</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <SettingsField label="Full name">
                    <SettingsInput value={fullName} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                </SettingsField>
                <SettingsField label="Email address">
                    <SettingsInput value={user?.email || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                </SettingsField>
                <SettingsField label="Sign-in method">
                    <div style={{
                        padding: '10px 14px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.7)',
                        border: '1px solid rgba(30,35,64,0.12)',
                        fontSize: 13, color: '#1E2340', fontWeight: 500,
                        display: 'flex', alignItems: 'center', gap: 8
                    }}>
                        {isGoogle ? (
                            <>
                                <GoogleLogoIcon size={18} />
                                <span>Google OAuth Sign-in</span>
                            </>
                        ) : (
                            <>
                                <EmailLogoIcon size={18} />
                                <span>Email &amp; Password Sign-in</span>
                            </>
                        )}
                    </div>
                </SettingsField>
            </div>
        </div>
    )
}

/* ─────────── Data section ─────────── */
function DataSection({ handleExportData, onDeleteRequest }) {
    return (
        <div>
            <SectionLabel>Your Data</SectionLabel>
            <p style={{ fontSize: 13, color: 'rgba(30,35,64,0.5)', marginBottom: 20 }}>
                Export or delete all your MemoryVerse data at any time.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <button
                    onClick={handleExportData}
                    style={{ ...ghostBtnStyle, padding: '9px 18px' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,35,64,0.1)'; e.currentTarget.style.color = '#1E2340'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,35,64,0.05)'; e.currentTarget.style.color = 'rgba(30,35,64,0.65)'; }}
                >
                    Export all my data
                </button>
                <button
                    onClick={onDeleteRequest}
                    style={{
                        ...ghostBtnStyle,
                        padding: '9px 18px',
                        color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.04)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.04)'; }}
                >
                    Delete all my data
                </button>
            </div>
        </div>
    )
}

/* ─────────── Shared UI helpers ─────────── */
function SectionLabel({ children }) {
    return (
        <p style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
            color: 'rgba(30,35,64,0.4)', textTransform: 'uppercase',
            margin: '0 0 14px',
        }}>{children}</p>
    )
}

function SettingsField({ label, children }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(30,35,64,0.65)', marginBottom: 6 }}>{label}</label>
            {children}
        </div>
    )
}

function SettingsInput({ style: extraStyle, ...props }) {
    return (
        <input
            style={{ ...inputStyle, ...extraStyle }}
            {...props}
        />
    )
}

const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 10,
    border: '1px solid rgba(30,35,64,0.12)',
    background: 'rgba(255,255,255,0.6)',
    color: '#1E2340',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
}

const ghostBtnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '7px 14px',
    borderRadius: 10,
    border: '1px solid rgba(30,35,64,0.14)',
    background: 'rgba(30,35,64,0.05)',
    color: 'rgba(30,35,64,0.65)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
}
