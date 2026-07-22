import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { MarkLogo } from './icons'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <MarkLogo className="w-8 h-8 opacity-50 animate-pulse" />
      </div>
    )
  }

  if (!user) return <Navigate to="/sign-in" replace />

  return children
}
