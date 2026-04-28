import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { credentials as credApi } from '../lib/api'

function CredentialResult({ cred, query }) {
  return (
    <div className="mt-8 space-y-6">
      {/* Status banner */}
      <div className="flex items-center gap-4 rounded p-5 border bg-brand-teal/5 border-brand-teal/30">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold bg-brand-teal/20 text-brand-teal flex-shrink-0">✓</div>
        <div>
          <div className="font-syne font-extrabold text-xl text-brand-teal">Credential Verified</div>
          <div className="font-mono text-[11px] text-brand-muted mt-0.5">This credential is authentic and recorded on Solana Devnet</div>
        </div>
        <div className="ml-auto font-mono text-[9px] text-brand-teal tracking-widest uppercase border border-brand-teal/30 px-3 py-1 rounded-full self-start flex-shrink-0">devnet</div>
      </div>

      {/* Credential card */}
      <div className="relative rounded border border-brand-orange/15 p-8" style={{background:'linear-gradient(145deg,#1A140E,#0F0C07)'}}>
        <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t" style={{background:'linear-gradient(90deg,#E8622A,#F2C14E,#07C8B5)'}} />

        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center font-syne font-black text-sm text-white">N</div>
          <span className="font-mono text-[10px] text-brand-muted tracking-widest uppercase">NeuroPass Credential</span>
          <span className="ml-auto font-mono text-[9px] text-brand-teal bg-brand-teal/10 border border-brand-teal/20 rounded-full px-2 py-0.5">DEVNET</span>
        </div>

        <div className="font-syne font-extrabold text-3xl text-brand-text tracking-tight mb-1">{cred.skill_name}</div>
        <div className="font-mono text-[11px] text-brand-orange tracking-widest uppercase mb-6">Verified · On-Chain</div>
        <div className="h-px bg-brand-border mb-6" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {[
            ['Verifier', cred.verifier],
            ['Mint Address', cred.mint_address],
          ].map(([l, v]) => (
            <div key={l}>
              <div className="font-mono text-[8px] text-brand-muted tracking-widest uppercase mb-1">{l}</div>
              <div className="font-mono text-[11px] text-brand-text break-all">{v}</div>
            </div>
          ))}
        </div>

        {cred.proof_hash && (
          <div>
            <div className="font-mono text-[8px] text-brand-muted tracking-widest uppercase mb-2">SHA-256 Proof Hash</div>
            <div className="rounded-sm border border-brand-teal/10 bg-brand-teal/5 p-3 font-mono text-[10px] text-brand-teal break-all leading-5 mb-5">
              {cred.proof_hash}
            </div>
          </div>
        )}

        {cred.metadata_uri && (
          <div>
            <div className="font-mono text-[8px] text-brand-muted tracking-widest uppercase mb-1">Metadata URI</div>
            <div className="font-mono text-[10px] text-brand-teal break-all">{cred.metadata_uri}</div>
          </div>
        )}
      </div>

      {/* Hash integrity check */}
      <div className="rounded border border-brand-border p-5 bg-brand-dark">
        <div className="font-mono text-[10px] text-brand-muted tracking-widest uppercase mb-4">On-Chain Integrity</div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-brand-teal">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-teal flex-shrink-0" />
          SHA-256 proof hash matches on-chain record — evidence is unaltered
        </div>
      </div>

      {/* Explorer link */}
      <div className="rounded border border-brand-border bg-brand-surface p-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="font-mono text-[10px] text-brand-muted tracking-widest uppercase mb-1">View on Solana Explorer</div>
          <div className="font-mono text-[11px] text-brand-teal truncate">{cred.mint_address}</div>
        </div>
        <a href={`https://explorer.solana.com/address/${cred.mint_address}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
          className="font-mono text-[10px] text-brand-orange tracking-widest uppercase border border-brand-orange/30 px-3 py-1.5 hover:bg-brand-orange/10 transition-colors flex-shrink-0">
          Open ↗
        </a>
      </div>
    </div>
  )
}

export default function Verify() {
  const { mintId } = useParams()
  const [query, setQuery] = useState(mintId || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (mintId) lookup(mintId)
  }, [mintId])

  const lookup = async (id) => {
    setLoading(true); setResult(null); setNotFound(false); setError('')
    try {
      const data = await credApi.verify(id.trim())
      if (data?.valid === false) setNotFound(true)
      else setResult(data)
    } catch (err) {
      if (err.status === 404) setNotFound(true)
      else setError(err.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async e => {
    e.preventDefault()
    if (!query.trim()) return
    lookup(query)
  }

  return (
    <div className="min-h-screen bg-brand-dark pt-20">
      <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(7,200,181,.04) 0%, transparent 60%)'}} />

      <div className="relative max-w-3xl mx-auto px-6 lg:px-8 py-12">
        <div className="mb-12">
          <div className="flex items-center gap-4 font-mono text-[10px] text-brand-teal tracking-widest uppercase mb-4">
            <span className="w-8 h-px bg-brand-teal" />Public Verification
          </div>
          <h1 className="font-syne font-extrabold text-4xl text-brand-text tracking-tight mb-3">
            Verify a <span className="text-brand-teal">Credential</span>
          </h1>
          <p className="font-mono text-[11px] text-brand-muted leading-6">
            Enter a mint address to publicly verify any NeuroPass credential. No account required — anyone can verify.
          </p>
        </div>

        <form onSubmit={handleVerify}>
          <div className="flex gap-0">
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Mint address (e.g. E96QSb...afPd7z)"
              className="flex-1 bg-brand-surface border border-brand-border border-r-0 rounded-l px-5 py-4 font-mono text-sm text-brand-text placeholder-brand-muted/40 focus:outline-none focus:border-brand-teal/50 transition-colors" />
            <button type="submit" disabled={loading || !query.trim()}
              className="bg-brand-teal text-brand-dark font-syne font-bold text-xs tracking-widest uppercase px-8 py-4 hover:brightness-110 transition-all disabled:opacity-40 rounded-r flex items-center gap-2">
              {loading ? <span className="w-4 h-4 border border-brand-dark/20 border-t-brand-dark rounded-full animate-spin" /> : null}
              {loading ? 'Checking...' : 'Verify →'}
            </button>
          </div>
        </form>

        {notFound && (
          <div className="mt-8 rounded border border-red-400/20 bg-red-400/5 p-6 text-center">
            <div className="text-3xl mb-3 text-red-400">✗</div>
            <div className="font-syne font-bold text-red-400 mb-2">Credential Not Found</div>
            <div className="font-mono text-[11px] text-brand-muted">No credential exists for this address on Solana Devnet.</div>
          </div>
        )}

        {error && (
          <div className="mt-8 rounded border border-red-400/20 bg-red-400/5 px-5 py-4 font-mono text-[11px] text-red-400">{error}</div>
        )}

        {result && <CredentialResult cred={result} query={query} />}

        {!result && !notFound && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
            {[
              { icon:'◎', title:'On-Chain', desc:'Every credential is permanently recorded on Solana Devnet' },
              { icon:'#', title:'Hash-Verified', desc:'SHA-256 proof ensures credentials cannot be forged or altered' },
              { icon:'◈', title:'No Login', desc:'Public verification requires no account — anyone can verify' },
            ].map(c => (
              <div key={c.title} className="bg-brand-surface border border-brand-border rounded p-6 text-center">
                <div className="text-2xl text-brand-teal mb-3">{c.icon}</div>
                <div className="font-syne font-bold text-sm text-brand-text mb-2">{c.title}</div>
                <div className="font-mono text-[10px] text-brand-muted leading-5">{c.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
