import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import FloatingChat from './components/FloatingChat'

import Landing from './pages/Landing'
import SignUp from './pages/SignUp'
import SignIn from './pages/SignIn'
import ForgotPassword from './pages/ForgotPassword'
import CheckEmail from './pages/CheckEmail'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Timeline from './pages/Timeline'
import Search from './pages/Search'
import Connections from './pages/Connections'
import Profile from './pages/Profile'

// Split out from App() so useAuth() can actually read the context —
// a component can't consume a provider it renders itself in the same
// function body, so this has to live one level below <AuthProvider>.
function AppContent() {
  const { user } = useAuth()

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        <Route path="/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
        <Route path="/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Routes>

      {/* Rendered once at root (not per-page) so open/closed state and chat
          history survive navigation — but only once someone is actually
          signed in. A logged-out visitor on Landing/SignIn/SignUp has no
          archive to ask about, so the bubble stays hidden until then. */}
      {user && <FloatingChat />}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}