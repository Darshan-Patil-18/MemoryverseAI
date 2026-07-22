import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthLayout from '../components/AuthLayout'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  return (
    <AuthLayout quoteIndex={1}>
      <h1 className="font-display text-3xl text-parchment-100 mb-1">Reset password</h1>
      <p className="text-parchment-100/50 mb-8">We'll email you a reset link</p>

      {sent ? (
        <div className="border border-thread-500/30 bg-thread-500/5 rounded-xl p-5">
          <p className="text-parchment-100 font-medium mb-1">Check your inbox</p>
          <p className="text-sm text-parchment-100/60">If an account exists for {email}, a reset link is on its way.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-parchment-100/70 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-ink-800 border border-parchment-100/15 rounded-lg px-4 py-2.5 text-parchment-100 placeholder:text-parchment-100/30 focus:border-gold-500/60 outline-none transition-colors"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-thread-500 hover:bg-thread-400 disabled:opacity-60 text-ink-950 font-medium py-3 rounded-lg transition-colors"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      <p className="mt-7 text-center text-sm text-parchment-100/50">
        <Link to="/sign-in" className="text-gold-500 hover:text-gold-400 underline">Back to sign in</Link>
      </p>
    </AuthLayout>
  )
}
