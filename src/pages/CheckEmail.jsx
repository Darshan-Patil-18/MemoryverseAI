import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthLayout from '../components/AuthLayout'

export default function CheckEmail() {
  const location = useLocation()
  const email = location.state?.email
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('')

  async function handleResend() {
    if (!email) return
    setStatus('sending')
    setErrorMsg('')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) {
      // Supabase's default email provider allows a handful of sends per hour —
      // this is almost always why "nothing arrives" during testing/demos.
      // A custom SMTP provider connected in Supabase Auth settings removes the limit.
      setStatus('error')
      setErrorMsg(error.message)
      return
    }
    setStatus('sent')
  }

  return (
    <AuthLayout quoteIndex={0}>
      <h1 className="font-display text-3xl text-parchment-100 mb-1">Get started</h1>
      <p className="text-parchment-100/50 mb-8">Create a new account</p>

      <div className="border border-thread-500/30 bg-thread-500/5 rounded-xl p-5 flex gap-3">
        <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-thread-500 text-ink-950 flex items-center justify-center text-xs">✓</span>
        <div>
          <p className="text-parchment-100 font-medium mb-1">Check your email to confirm</p>
          <p className="text-sm text-parchment-100/60 leading-relaxed">
            You've successfully signed up{email ? <> as <span className="text-parchment-100/80">{email}</span></> : ''}.
            Please check your inbox (and spam folder) and click the confirmation link to activate your MemoryVerse account.
            The link expires in 10 minutes.
          </p>
        </div>
      </div>

      {email && (
        <div className="mt-4">
          <button
            onClick={handleResend}
            disabled={status === 'sending' || status === 'sent'}
            className="text-sm text-gold-500 hover:text-gold-400 underline disabled:no-underline disabled:opacity-60"
          >
            {status === 'sending' ? 'Resending…' : status === 'sent' ? 'Confirmation email resent ✓' : "Didn't get it? Resend email"}
          </button>
          {status === 'error' && (
            <p className="text-xs text-red-400 mt-2 leading-relaxed">
              {errorMsg}. If this keeps happening, it's usually because Supabase's default mailer has a low
              hourly sending limit during testing — connecting a custom SMTP provider in your Supabase Auth
              settings removes that limit.
            </p>
          )}
        </div>
      )}

      <p className="mt-7 text-center text-sm text-parchment-100/50">
        Have an account? <Link to="/sign-in" className="text-gold-500 hover:text-gold-400 underline">Sign in</Link>
      </p>
    </AuthLayout>
  )
}