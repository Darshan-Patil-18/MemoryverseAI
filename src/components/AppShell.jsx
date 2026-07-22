import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { MarkLogo } from './icons'

const NAV = [
  { to: '/dashboard', label: 'Archive', icon: '◆' },
  { to: '/upload', label: 'Add document', icon: '+' },
  { to: '/timeline', label: 'Timeline', icon: '~' },
  { to: '/search', label: 'Ask', icon: '?' }
]

export default function AppShell({ children }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col sm:flex-row">
      <aside className="sm:w-60 flex-shrink-0 border-b sm:border-b-0 sm:border-r border-parchment-100/10 flex sm:flex-col">
        <div className="px-5 py-5 flex items-center gap-2.5">
          <MarkLogo className="w-7 h-7" />
          <span className="font-display text-parchment-100 text-sm hidden sm:inline">MemoryVerse</span>
        </div>
        <nav className="flex sm:flex-col flex-1 px-3 gap-1 overflow-x-auto sm:overflow-visible">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  isActive ? 'bg-gold-500/10 text-gold-400' : 'text-parchment-100/60 hover:text-parchment-100 hover:bg-parchment-100/5'
                }`
              }
            >
              <span className="font-mono w-4 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden sm:block px-5 py-5 border-t border-parchment-100/10">
          <p className="text-xs text-parchment-100/40 truncate mb-2">{user?.email}</p>
          <button onClick={handleSignOut} className="text-xs text-parchment-100/50 hover:text-parchment-100 underline">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
