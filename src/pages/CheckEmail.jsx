import { useLocation, Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'

export default function CheckEmail() {
  const location = useLocation()
  const email = location.state?.email

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
            Please check your inbox and click the confirmation link to activate your MemoryVerse account.
            The link expires in 10 minutes.
          </p>
        </div>
      </div>

      <p className="mt-7 text-center text-sm text-parchment-100/50">
        Have an account? <Link to="/sign-in" className="text-gold-500 hover:text-gold-400 underline">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
