import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MarkLogo } from '../components/icons'

// This is the page a user lands on after clicking the confirmation
// link in their email, or after completing Google OAuth. Supabase
// exchanges the token in the URL for a session automatically
// (detectSessionInUrl: true), we just wait for it then redirect.
export default function AuthCallback() {
  const [status, setStatus] = useState('confirming') // confirming | success | error
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return

      if (data.session) {
        setStatus('success')
        setTimeout(() => navigate('/dashboard', { replace: true }), 1400)
        return
      }

      // Session not ready yet — listen briefly for the auth event
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          setStatus('success')
          setTimeout(() => navigate('/dashboard', { replace: true }), 1400)
        }
      })

      setTimeout(() => {
        if (!cancelled) {
          supabase.auth.getSession().then(({ data }) => {
            if (!data.session) setStatus('error')
          })
        }
      }, 4000)

      return () => sub.subscription.unsubscribe()
    }

    resolve()
    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <MarkLogo className="w-10 h-10 mx-auto mb-6" />
        {status === 'confirming' && (
          <>
            <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin mx-auto mb-5" />
            <p className="text-parchment-100/70">Confirming your account…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-full bg-thread-500 text-ink-950 flex items-center justify-center text-2xl mx-auto mb-5">✓</div>
            <h1 className="font-display text-2xl text-parchment-100 mb-2">Email confirmed</h1>
            <p className="text-parchment-100/60">Taking you to your archive…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="font-display text-2xl text-parchment-100 mb-2">That link didn't work</h1>
            <p className="text-parchment-100/60 mb-6">It may have expired. Try signing in, or request a new confirmation email.</p>
            <a href="/sign-in" className="inline-block bg-gold-500 hover:bg-gold-400 text-ink-950 font-medium px-6 py-2.5 rounded-full transition-colors">
              Go to sign in
            </a>
          </>
        )}
      </div>
    </div>
  )
}
