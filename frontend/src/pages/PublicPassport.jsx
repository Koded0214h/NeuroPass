import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { credentials as credApi } from '../lib/api'

export default function PublicPassport() {
  const { username } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    credApi.publicPassport(username)
      .then(res => {
        if (res.error) setNotFound(true)
        else setData(res)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center pt-20">
      <div className="w-8 h-8 border border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center pt-20 px-6">
      <div className="text-center">
        <div className="font-syne font-extrabold text-[8rem] text-brand-orange/10 leading-none mb-6">404</div>
        <h1 className="font-syne font-extrabold text-3xl text-brand-text mb-3">Profile not found</h1>
        <Link to="/" className="font-mono text-[11px] text-brand-orange hover:underline">← Back to NeuroPass</Link>
      </div>
    </div>
  )

  const { credentials = [] } = data

  return (
    <div className="min-h-screen bg-brand-dark pt-20">
      <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(7,200,181,.04) 0%, transparent 60%)'}} />

      <div className="relative max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-full bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center mx-auto mb-4">
            <span className="font-syne font-black text-2xl text-brand-orange">{username[0].toUpperCase()}</span>
          </div>
          <h1 className="font-syne font-extrabold text-3xl text-brand-text mb-1">{username}</h1>
          {data.wallet_address && (
            <p className="font-mono text-[10px] text-brand-teal tracking-widest">
              {data.wallet_address.slice(0,8)}...{data.wallet_address.slice(-6)}
            </p>
          )}
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-teal" />
            <span className="font-mono text-[10px] text-brand-muted tracking-widest uppercase">
              {credentials.length} Verified Credential{credentials.length !== 1 ? 's' : ''} · Solana Devnet
            </span>
          </div>
        </div>

        {credentials.length === 0 ? (
          <div className="text-center border border-brand-border rounded p-12 bg-brand-surface">
            <div className="font-mono text-[11px] text-brand-muted">No verified credentials yet.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {credentials.map(c => (
              <div key={c.mint_address} className="relative rounded border border-brand-border bg-brand-surface p-6 hover:border-brand-teal/30 transition-all">
                <div className="absolute top-0 left-0 right-0 h-[1px] rounded-t" style={{background:'linear-gradient(90deg,#07C8B5,transparent)'}} />

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-syne font-bold text-lg text-brand-text">{c.skill_name}</div>
                    <div className="font-mono text-[10px] text-brand-orange tracking-widest uppercase">{c.skill_level}</div>
                  </div>
                  <span className="font-mono text-[9px] text-brand-teal border border-brand-teal/30 bg-brand-teal/5 px-2.5 py-1 rounded-full">✓ Verified</span>
                </div>

                {c.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {c.tags.map(t => (
                      <span key={t} className="font-mono text-[9px] text-brand-muted border border-brand-border px-2 py-0.5">{t}</span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4 text-[10px] font-mono">
                  <div>
                    <div className="text-brand-muted tracking-widest uppercase text-[8px] mb-0.5">Verifier</div>
                    <div className="text-brand-text">{c.verifier}</div>
                  </div>
                  <div>
                    <div className="text-brand-muted tracking-widest uppercase text-[8px] mb-0.5">Minted</div>
                    <div className="text-brand-text">{new Date(c.minted_at).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-brand-muted tracking-widest uppercase text-[8px] mb-0.5">Proof Hash</div>
                    <div className="text-brand-teal truncate">{c.proof_hash.slice(0,20)}...{c.proof_hash.slice(-8)}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a href={`https://explorer.solana.com/address/${c.mint_address}?cluster=devnet`}
                    target="_blank" rel="noreferrer"
                    className="flex-1 text-center font-mono text-[10px] tracking-widest uppercase border border-brand-teal/30 text-brand-teal py-2 hover:bg-brand-teal/10 transition-colors">
                    ↗ Explorer
                  </a>
                  <Link to={`/verify/${c.mint_address}`}
                    className="flex-1 text-center font-mono text-[10px] tracking-widest uppercase border border-brand-orange/30 text-brand-orange py-2 hover:bg-brand-orange/10 transition-colors">
                    Verify
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link to="/" className="font-mono text-[10px] text-brand-muted hover:text-brand-orange transition-colors tracking-widest">
            Powered by NEUROPASS · Solana Devnet
          </Link>
        </div>
      </div>
    </div>
  )
}
