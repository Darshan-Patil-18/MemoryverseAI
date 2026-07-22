import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthLayout from '../components/AuthLayout'
import { GoogleIcon } from '../components/icons'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleGoogle() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) setError(error.message)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/dashboard')
  }

  return (
    <AuthLayout quoteIndex={1}>
      <h1 className="font-display text-3xl text-parchment-100 mb-1">Welcome back</h1>
      <p className="text-parchment-100/50 mb-8">Sign in to your account</p>

      <button
        onClick={handleGoogle}
        className="w-full flex items-center justify-center gap-3 border border-parchment-100/15 hover:border-parchment-100/30 hover:bg-parchment-100/5 text-parchment-100 py-3 rounded-xl transition-colors"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="flex items-center gap-4 my-7">
        <div className="h-px flex-1 bg-parchment-100/10" />
        <span className="text-xs text-parchment-100/40">or</span>
        <div className="h-px flex-1 bg-parchment-100/10" />
      </div>

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
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm text-parchment-100/70">Password</label>
            <Link to="/forgot-password" className="text-xs text-parchment-100/40 hover:text-parchment-100/70">Forgot password?</Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-ink-800 border border-parchment-100/15 rounded-lg px-4 py-2.5 pr-11 text-parchment-100 placeholder:text-parchment-100/30 focus:border-gold-500/60 outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment-100/40 hover:text-parchment-100/70 text-xs"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-thread-500 hover:bg-thread-400 disabled:opacity-60 text-ink-950 font-medium py-3 rounded-lg transition-colors"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-parchment-100/50">
        Don't have an account? <Link to="/sign-up" className="text-gold-500 hover:text-gold-400 underline">Sign up</Link>
      </p>
    </AuthLayout>
  )
}
