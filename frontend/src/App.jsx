import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Cursor from './components/Cursor'
import Nav from './components/Nav'
import Footer from './components/Footer'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import SubmitSkill from './pages/SubmitSkill'
import Verify from './pages/Verify'
import VerifierPanel from './pages/VerifierPanel'
import Profile from './pages/Profile'
import PublicPassport from './pages/PublicPassport'

function Layout({ children, hideFooter }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
      {!hideFooter && <Footer />}
    </>
  )
}

function Protected({ children }) {
  const { isLoggedIn, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center">
      <div className="w-8 h-8 border border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
    </div>
  )
  if (!isLoggedIn) return <Navigate to="/auth" replace />
  return children
}

function VerifierProtected({ children }) {
  const { isLoggedIn, isVerifier, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center">
      <div className="w-8 h-8 border border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
    </div>
  )
  if (!isLoggedIn) return <Navigate to="/auth" replace />
  if (!isVerifier) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Cursor />
      <Routes>
        <Route path="/" element={<Layout><Landing /></Layout>} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/verify" element={<Layout><Verify /></Layout>} />
        <Route path="/verify/:mintId" element={<Layout><Verify /></Layout>} />
        <Route path="/u/:username" element={<Layout><PublicPassport /></Layout>} />
        <Route path="/dashboard" element={<Protected><Layout><Dashboard /></Layout></Protected>} />
        <Route path="/submit"    element={<Protected><Layout><SubmitSkill /></Layout></Protected>} />
        <Route path="/profile"   element={<Protected><Layout><Profile /></Layout></Protected>} />
        <Route path="/verifier"  element={<VerifierProtected><Layout><VerifierPanel /></Layout></VerifierProtected>} />
        <Route path="*" element={<Layout><NotFound /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-6 pt-20">
      <div className="text-center">
        <div className="font-syne font-extrabold text-[12rem] text-brand-orange/10 leading-none mb-6">404</div>
        <h1 className="font-syne font-extrabold text-4xl text-brand-text mb-4">Page not found</h1>
        <p className="font-mono text-sm text-brand-muted mb-8">This credential doesn't exist on-chain.</p>
        <a href="/" className="font-syne font-bold text-xs tracking-widest uppercase bg-brand-orange text-white px-8 py-4 hover:brightness-110 transition-all">
          Back to NeuroPass
        </a>
      </div>
    </div>
  )
}
