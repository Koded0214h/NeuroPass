import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { isLoggedIn, isVerifier, user, walletAddress, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isLanding = location.pathname === '/'

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const handleLogout = () => { logout(); navigate('/') }

  const appLinks = [
    ['Dashboard', '/dashboard'],
    ['Submit', '/submit'],
    ['Verify', '/verify'],
    ['Profile', '/profile'],
    ...(isVerifier ? [['Verifier', '/verifier']] : []),
  ]

  const landingLinks = [
    ['How it Works', '/#how'],
    ['Technology', '/#tech'],
    ["Who it's For", '/#who'],
  ]

  const links = isLanding ? landingLinks : appLinks

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-12 py-5 transition-all duration-300 ${scrolled || !isLanding ? 'nav-scrolled' : ''}`}>
      <Link to="/" className="font-syne font-extrabold text-lg tracking-tight text-brand-text">
        NEURO<span className="text-brand-orange">PASS</span>
      </Link>

      <ul className="hidden md:flex items-center gap-7 lg:gap-10">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link to={href} className={`font-mono text-[10px] tracking-widest uppercase transition-colors ${location.pathname === href ? 'text-brand-orange' : 'text-brand-muted hover:text-brand-text'}`}>
              {label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden md:flex items-center gap-3">
        {walletAddress && (
          <div className="flex items-center gap-1.5 border border-brand-teal/20 bg-brand-teal/5 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-teal" />
            <span className="font-mono text-[9px] text-brand-teal tracking-widest">
              {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
            </span>
          </div>
        )}
        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-brand-muted">{user?.username}</span>
            <button onClick={handleLogout} className="font-mono text-[10px] tracking-widest uppercase text-brand-muted border border-brand-border px-4 py-2 hover:text-brand-orange hover:border-brand-orange/30 transition-all">
              Sign Out
            </button>
          </div>
        ) : (
          <Link to="/auth" className="font-syne font-bold text-[11px] tracking-widest uppercase bg-brand-orange text-white px-5 py-2.5 hover:brightness-110 transition-all">
            Launch App
          </Link>
        )}
      </div>

      <button className="md:hidden text-brand-muted hover:text-brand-text" onClick={() => setMenuOpen(o => !o)}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {menuOpen
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/>
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16"/>}
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-brand-surface border-t border-brand-border px-8 py-6 flex flex-col gap-4 md:hidden">
          {links.map(([label, href]) => (
            <Link key={href} to={href} onClick={() => setMenuOpen(false)} className="font-mono text-[11px] text-brand-muted tracking-widest uppercase hover:text-brand-text">
              {label}
            </Link>
          ))}
          {isLoggedIn
            ? <button onClick={() => { handleLogout(); setMenuOpen(false) }} className="font-mono text-[11px] text-brand-muted tracking-widest uppercase text-left">Sign Out</button>
            : <Link to="/auth" onClick={() => setMenuOpen(false)} className="font-syne font-bold text-[11px] tracking-widest uppercase bg-brand-orange text-white px-5 py-2.5 text-center mt-2">Launch App</Link>
          }
        </div>
      )}
    </nav>
  )
}
