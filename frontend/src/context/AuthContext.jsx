import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { auth, getTokens } from '../lib/api'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import bs58 from 'bs58'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  
  const { publicKey, signMessage, disconnect, connected, wallet } = useWallet()
  const { setVisible } = useWalletModal()

  const fetchMe = useCallback(async () => {
    if (!getTokens().access) { 
      setLoading(false)
      setUser(null)
      return 
    }
    try {
      const me = await auth.me()
      setUser(me)
    } catch (err) {
      console.error("Failed to fetch user:", err)
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
    if (connected) disconnect()
  }

  const handleWalletAuth = async () => {
    if (!publicKey || !signMessage) return
    
    setIsVerifying(true)
    try {
      const walletAddr = publicKey.toString()
      
      // 1. Get Nonce
      const nonce = await auth.getNonce(walletAddr)
      
      // 2. Sign Message
      const message = new TextEncoder().encode(nonce)
      const signature = await signMessage(message)
      const signatureBase58 = bs58.encode(signature)
      
      // 3. Verify on Backend
      if (user) {
        // We are already logged in, just linking wallet
        await auth.linkWallet(walletAddr, signatureBase58)
        await fetchMe()
      } else {
        // Not logged in, performing Web3 login
        await auth.verifyWallet(walletAddr, signatureBase58)
        await fetchMe()
      }
    } catch (err) {
      console.error("Wallet auth failed:", err)
      throw err
    } finally {
      setIsVerifying(false)
    }
  }

  // Trigger wallet auth when wallet connects and we don't have it linked yet
  useEffect(() => {
    if (connected && publicKey) {
      const currentWallet = user?.profile?.wallet_address
      if (!currentWallet || currentWallet !== publicKey.toString()) {
         // Auto-link or auto-login could go here, but safer to let user trigger it
         // Or check if we are on auth page
      }
    }
  }, [connected, publicKey, user])

  const connectWallet = () => {
    if (!connected) {
      setVisible(true)
    } else {
      handleWalletAuth()
    }
  }

  return (
    <AuthContext.Provider value={{
      user, loading, isVerifying,
      walletAddress: user?.profile?.wallet_address || publicKey?.toString() || null,
      walletConnected: connected,
      login, register, logout, connectWallet, handleWalletAuth, fetchMe,
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
