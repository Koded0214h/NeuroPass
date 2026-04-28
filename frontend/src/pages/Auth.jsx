import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'

function PhantomIcon() {
  return (
    <svg viewBox="0 0 128 128" className="w-5 h-5" fill="none">
      <rect width="128" height="128" rx="24" fill="#AB9FF2"/>
      <path d="M110.584 64.9142H99.142C99.142 41.7651 80.173 23 56.7724 23C33.6612 23 14.8716 41.3765 14.4236 64.0212C13.9578 87.5798 33.7919 107 57.4951 107H60.5578C81.3608 107 108.069 91.3449 112.715 71.3295C113.558 67.7925 111.237 64.9142 110.584 64.9142ZM45.0851 64C45.0851 67.3137 42.3988 70 39.0851 70C35.7713 70 33.0851 67.3137 33.0851 64C33.0851 60.6863 35.7713 58 39.0851 58C42.3988 58 45.0851 60.6863 45.0851 64ZM60.0851 64C60.0851 67.3137 57.3988 70 54.0851 70C50.7713 70 48.0851 67.3137 48.0851 64C48.0851 60.6863 50.7713 58 54.0851 58C57.3988 58 60.0851 60.6863 60.0851 64Z" fill="white"/>
    </svg>
  )
}

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login, register, isLoggedIn, handleWalletAuth, isVerifying } = useAuth()
  const { connected, publicKey, disconnect } = useWallet()
  const { setVisible } = useWalletModal()
  const navigate = useNavigate()

  useEffect(() => { if (isLoggedIn) navigate('/dashboard') }, [isLoggedIn, navigate])

  const handleWalletClick = () => {
    if (!connected) {
      setVisible(true)
    } else {
      // If already connected, trigger sign-in flow
      handleWalletAuth().catch(err => {
        setError('Wallet verification failed')
      })
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') {
        await login(form.username, form.password)
      } else {
        await register(form.username, form.email, form.password, publicKey?.toString() || '')
      }
      navigate('/dashboard')
    } catch (err) {
      const data = err.response?.data || err.data || {}
      const msg = data.detail
        || (Array.isArray(data.username) ? data.username.join(' ') : data.username)
        || (Array.isArray(data.email) ? data.email.join(' ') : data.email)
        || (Array.isArray(data.password) ? data.password.join(' ') : data.password)
        || (Array.isArray(data.non_field_errors) ? data.non_field_errors.join(' ') : data.non_field_errors)
        || err.message
        || 'Something went wrong'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const isSignup = mode === 'signup'
  const phantomAddr = publicKey?.toString()

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4 pt-20">
      <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(232,98,42,.05) 0%, transparent 70%)'}} />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <Link to="/" className="font-syne font-extrabold text-2xl text-brand-text">NEURO<span className="text-brand-orange">PASS</span></Link>
          <p className="font-mono text-[11px] text-brand-muted tracking-widest mt-2 uppercase">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        <div className="relative rounded border border-brand-border bg-brand-surface p-8" style={{boxShadow:'0 40px 80px rgba(0,0,0,.5)'}}>
          <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t" style={{background:'linear-gradient(90deg,#E8622A,#07C8B5)'}} />

          {/* Tab toggle */}
          <div className="flex mb-8 border border-brand-border rounded overflow-hidden">
            {[['login','Sign In'],['signup','Sign Up']].map(([k,l]) => (
              <button key={k} onClick={() => { setMode(k); setError('') }}
                className={`flex-1 py-2.5 font-mono text-[11px] tracking-widest uppercase transition-all ${mode === k ? 'bg-brand-orange text-white' : 'text-brand-muted hover:text-brand-text'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Wallet button */}
          <button onClick={handleWalletClick} disabled={isVerifying}
            className="w-full flex items-center justify-center gap-3 border border-[#AB9FF2]/30 bg-[#AB9FF2]/10 text-[#AB9FF2] font-mono text-[11px] tracking-widest uppercase py-3.5 mb-2 hover:bg-[#AB9FF2]/20 transition-all disabled:opacity-50 rounded">
            {isVerifying
              ? <span className="w-4 h-4 border border-[#AB9FF2]/40 border-t-[#AB9FF2] rounded-full animate-spin" />
              : <PhantomIcon />}
            {isVerifying ? 'Verifying...' : phantomAddr ? `Connected: ${phantomAddr.slice(0,8)}...` : 'Connect Wallet'}
          </button>
          
          {phantomAddr && (
            <div className="flex flex-col items-center mb-4">
              <p className="font-mono text-[9px] text-brand-teal text-center tracking-widest mb-1">
                ✓ Wallet will be linked {isSignup ? 'on registration' : 'to your account'}
              </p>
              <button onClick={() => disconnect()} className="font-mono text-[8px] text-brand-muted hover:text-red-400 underline uppercase tracking-tighter">
                Disconnect
              </button>
            </div>
          )}
          {!phantomAddr && <p className="font-mono text-[9px] text-brand-muted text-center mb-5 tracking-widest">Optional — link your Solana wallet</p>}

          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 h-px bg-brand-border" />
            <span className="font-mono text-[10px] text-brand-muted tracking-widest">OR</span>
            <div className="flex-1 h-px bg-brand-border" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] text-brand-muted tracking-widest uppercase mb-2">Username</label>
              <input type="text" required value={form.username} onChange={e => setForm(f => ({...f, username: e.target.value}))}
                placeholder="yourname"
                className="w-full bg-brand-dark border border-brand-border rounded px-4 py-3 font-mono text-sm text-brand-text placeholder-brand-muted/40 focus:outline-none focus:border-brand-orange/50 transition-colors" />
            </div>

            {isSignup && (
              <div>
                <label className="block font-mono text-[10px] text-brand-muted tracking-widest uppercase mb-2">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                  placeholder="you@example.com"
                  className="w-full bg-brand-dark border border-brand-border rounded px-4 py-3 font-mono text-sm text-brand-text placeholder-brand-muted/40 focus:outline-none focus:border-brand-orange/50 transition-colors" />
              </div>
            )}

            <div>
              <label className="block font-mono text-[10px] text-brand-muted tracking-widest uppercase mb-2">Password</label>
              <input type="password" required value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
                placeholder="••••••••"
                className="w-full bg-brand-dark border border-brand-border rounded px-4 py-3 font-mono text-sm text-brand-text placeholder-brand-muted/40 focus:outline-none focus:border-brand-orange/50 transition-colors" />
            </div>

            {error && (
              <div className="rounded border border-red-400/20 bg-red-400/5 px-4 py-3 font-mono text-[11px] text-red-400">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || isVerifying}
              className="w-full bg-brand-orange text-white font-syne font-bold text-xs tracking-widest uppercase py-4 mt-2 hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading
                ? <><span className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />Processing...</>
                : isSignup ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="font-mono text-[10px] text-brand-muted text-center mt-5">
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <button onClick={() => { setMode(isSignup ? 'login' : 'signup'); setError('') }}
            className="text-brand-orange hover:underline">
            {isSignup ? 'Sign In' : 'Sign Up'}
          </button>
        </p>

        <p className="font-mono text-[9px] text-brand-muted/40 text-center mt-4">
          JWT Auth · Solana Devnet · OnchainED 1.0
        </p>
      </div>
    </div>
  )
}
