import { NavLink, useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { MarkLogo } from './icons'
import Avatar from './Avatar'
import ConfirmModal from './ConfirmModal'
import FloatingChat from './FloatingChat'

const NAV = [
  { to: '/dashboard', label: 'Archive', icon: '◇' },
  { to: '/upload', label: 'Add to portfolio', icon: '+' },
  { to: '/timeline', label: 'Timeline', icon: '~' },
  { to: '/connections', label: 'Connections', icon: '⌘' },
  { to: '/search', label: 'Search', icon: '⌕' }
]

export default function AppShell({ children }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col sm:flex-row sm:gap-4 sm:p-4">
      <aside className="sm:w-64 flex-shrink-0 flex sm:flex-col glass-panel sm:rounded-3xl sm:h-[calc(100vh-2rem)] sm:sticky sm:top-4 overflow-hidden">
        <div className="px-5 py-5 flex items-center gap-2.5 group relative">
          <MarkLogo className="w-7 h-7" />
          <span className="font-display text-parchment-100 text-[15px] hidden sm:inline">MemoryVerse</span>
        </div>

        <nav className="flex sm:flex-col flex-1 px-3 gap-1 overflow-x-auto sm:overflow-visible">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm whitespace-nowrap transition-all ${isActive
                  ? 'text-[#1E2340] shadow-sm'
                  : 'text-parchment-100/60 hover:text-parchment-100 hover:bg-white/40'
                }`
              }
              style={({ isActive }) =>
                isActive ? { background: 'linear-gradient(135deg, rgba(124,140,255,0.35), rgba(192,132,245,0.3))' } : undefined
              }
            >
              <span className="font-mono w-4 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden sm:block px-4 py-4 border-t border-parchment-100/10 relative">
          <button
            onClick={() => setProfileMenuOpen((open) => !open)}
            className="w-full flex items-center gap-2.5 p-2 rounded-2xl transition-all text-left group"
            style={{ background: profileMenuOpen ? 'rgba(30,35,64,0.1)' : 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(30,35,64,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = profileMenuOpen ? 'rgba(30,35,64,0.1)' : 'transparent'}
          >
            <Avatar url={avatarUrl} name={displayName} email={user?.email} provider={user?.app_metadata?.provider} size={30} />
            <span className="text-xs truncate font-medium" style={{ color: 'rgba(30,35,64,0.75)' }}>{displayName || user?.email}</span>
            <span className="ml-auto" style={{ color: 'rgba(30,35,64,0.5)' }}>⌄</span>
          </button>
          {profileMenuOpen && (
            <div className="absolute bottom-16 left-4 right-4 rounded-2xl glass-panel shadow-xl p-1.5">
              <Link
                onClick={() => setProfileMenuOpen(false)}
                to="/profile"
                className="block text-sm px-3 py-2 rounded-xl transition-colors"
                style={{ color: 'rgba(30,35,64,0.8)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,35,64,0.1)'; e.currentTarget.style.color = 'rgba(30,35,64,1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(30,35,64,0.8)'; }}
              >
                Settings
              </Link>
              <button
                onClick={() => {
                  setProfileMenuOpen(false)
                  setConfirmSignOut(true)
                }}
                className="w-full text-left text-sm px-3 py-2 rounded-xl text-red-500 transition-colors"
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>

      <ConfirmModal
        open={confirmSignOut}
        title="Log out?"
        message="Are you sure you want to log out of MemoryVerse?"
        confirmLabel="Yes, log out"
        danger={false}
        onConfirm={handleSignOut}
        onCancel={() => setConfirmSignOut(false)}
      />

      {/* Lives here, not in App.jsx: AppShell only ever renders for the
          authenticated app pages (Dashboard/Upload/Timeline/Search/
          Connections/Profile), never for Landing/SignIn/SignUp. That means
          this can never leak onto the public marketing page again, even if
          a valid session token is still sitting in localStorage from an
          earlier sign-in — being "inside the app" is what shows it, not
          just having a token somewhere. */}
      <FloatingChat />
    </div>
  )
}