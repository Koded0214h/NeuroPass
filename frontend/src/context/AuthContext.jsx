import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { auth, getTokens } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [walletAddress, setWalletAddress] = useState(null)
  const [walletConnecting, setWalletConnecting] = useState(false)

  const fetchMe = useCallback(async () => {
    if (!getTokens().access) { setLoading(false); return }
    try {
      const me = await auth.me()
      setUser(me)
      if (me.profile?.wallet_address) setWalletAddress(me.profile.wallet_address)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMe() }, [fetchMe])

  const login = async (username, password) => {
    await auth.login(username, password)
    await fetchMe()
  }

  const register = async (username, email, password, wallet_address = '') => {
    await auth.register(username, email, password, wallet_address)
    await auth.login(username, password)
    await fetchMe()
  }

  const logout = () => {
    auth.logout()
    setUser(null)
    setWalletAddress(null)
  }

  const connectPhantom = async () => {
    const phantom = window.solana
    if (!phantom?.isPhantom) {
      window.open('https://phantom.app/', '_blank')
      throw new Error('Phantom wallet not installed')
    }
    setWalletConnecting(true)
    try {
      const resp = await phantom.connect()
      const addr = resp.publicKey.toString()
      setWalletAddress(addr)
      if (user) {
        await auth.linkWallet(addr)
        await fetchMe()
      }
      return addr
    } finally {
      setWalletConnecting(false)
    }
  }

  const disconnectPhantom = async () => {
    if (window.solana?.isPhantom) await window.solana.disconnect()
    setWalletAddress(null)
  }

  return (
    <AuthContext.Provider value={{
      user, loading, walletAddress, walletConnecting,
      login, register, logout, connectPhantom, disconnectPhantom, fetchMe,
      isLoggedIn: !!user,
      isVerifier: user?.profile?.is_verifier ?? false,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
