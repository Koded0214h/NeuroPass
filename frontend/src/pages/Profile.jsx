import { useState, useEffect } from 'react'
import { credentials as credApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function TrustBar({ score }) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="font-mono text-[10px] text-brand-muted tracking-widest uppercase">Reputation Score</span>
        <span className="font-syne font-bold text-brand-orange">{Number(score ?? 0).toFixed(0)}</span>
      </div>
      <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{width:`${Math.min(score || 0, 100)}%`,background:'linear-gradient(90deg,#E8622A,#F2C14E)'}} />
      </div>
    </div>
  )
}

function CredentialBadge({ skill }) {
  const cred = skill.credential
  return (
    <div className="cred-3d relative rounded border border-brand-orange/20 p-6" style={{background:'linear-gradient(145deg,#1A140E,#0F0C07)',boxShadow:'0 20px 50px rgba(0,0,0,.5)'}}>
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t" style={{background:'linear-gradient(90deg,#E8622A,#07C8B5)'}} />
      <div className="flex items-center justify-between mb-4">
        <div className="w-5 h-5 rounded-full bg-brand-orange flex items-center justify-center font-syne font-black text-[9px] text-white">N</div>
        <span className="font-mono text-[9px] text-brand-teal bg-brand-teal/10 border border-brand-teal/20 rounded-full px-2 py-0.5">✓ VERIFIED</span>
      </div>
      <div className="font-syne font-bold text-xl text-brand-text mb-0.5">{skill.name}</div>
      <div className="font-mono text-[9px] text-brand-orange tracking-widest uppercase mb-4">{skill.skill_level || 'Verified'}</div>
      <div className="h-px bg-brand-border mb-4" />
      <div className="space-y-2">
        {[
          ['Issued', new Date(skill.submitted_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})],
          ...(cred?.mint_address ? [['Mint', cred.mint_address.slice(0,12)+'...'+cred.mint_address.slice(-6)]] : []),
        ].map(([l,v]) => (
          <div key={l} className="flex justify-between gap-3">
            <span className="font-mono text-[9px] text-brand-muted tracking-widest uppercase flex-shrink-0">{l}</span>
            <span className="font-mono text-[10px] text-brand-text text-right truncate">{v}</span>
          </div>
        ))}
        {skill.file_sha256 && (
          <div>
            <div className="font-mono text-[8px] text-brand-muted tracking-widest uppercase mb-1">Hash</div>
            <div className="font-mono text-[9px] text-brand-teal truncate">{skill.file_sha256.slice(0,20)}...</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Profile() {
  const { user, walletAddress, connectPhantom, walletConnecting } = useAuth()
  const [passport, setPassport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState(false)

  useEffect(() => {
    credApi.passport()
      .then(setPassport)
      .catch(() => setPassport(null))
      .finally(() => setLoading(false))
  }, [])

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 2000) })
  }

  const handleExport = async () => {
    if (!passport) return
    setExporting(true)
    await new Promise(r => setTimeout(r, 600))
    setExporting(false)
    setExported(true)
    const blob = new Blob([JSON.stringify(passport, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'neuropass-profile.json'; a.click()
    URL.revokeObjectURL(url)
    setTimeout(() => setExported(false), 3000)
  }

  const skills = passport?.verified_skills || []
  const profileUrl = `${window.location.origin}/u/${user?.username}`
  const minted = skills.filter(s => s.credential?.mint_address).length

  if (loading) return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center pt-20">
      <div className="w-8 h-8 border border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-brand-dark pt-20">
      <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(242,193,78,.04) 0%, transparent 60%)'}} />

      <div className="relative max-w-5xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex items-center gap-4 font-mono text-[10px] text-brand-gold tracking-widest uppercase mb-8">
          <span className="w-8 h-px bg-brand-gold" />Your Profile
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Profile card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="relative bg-brand-surface border border-brand-border rounded p-6">
              <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t" style={{background:'linear-gradient(90deg,#E8622A,#F2C14E,#07C8B5)'}} />

              {/* Avatar */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-brand-orange/20 border-2 border-brand-orange/30 flex items-center justify-center font-syne font-extrabold text-3xl text-brand-orange mb-4">
                  {(user?.username || 'U')[0].toUpperCase()}
                </div>
                <div className="font-syne font-extrabold text-xl text-brand-text">{user?.username}</div>
                {user?.email && <div className="font-mono text-[10px] text-brand-muted mt-0.5">{user.email}</div>}
                {passport?.trust_metrics?.is_verifier && (
                  <span className="mt-2 font-mono text-[9px] text-brand-gold border border-brand-gold/30 bg-brand-gold/5 rounded-full px-2.5 py-1 tracking-widest uppercase">Verifier</span>
                )}
              </div>

              <TrustBar score={passport?.trust_metrics?.reputation_score ?? 0} />

              {/* Wallet */}
              <div className="h-px bg-brand-border my-5" />
              {walletAddress ? (
                <div>
                  <div className="font-mono text-[9px] text-brand-muted tracking-widest uppercase mb-2">Wallet Address</div>
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-[10px] text-brand-teal flex-1 truncate">{walletAddress.slice(0,16)}...{walletAddress.slice(-8)}</div>
                    <button onClick={() => copy(walletAddress, 'wallet')} className="font-mono text-[10px] text-brand-muted hover:text-brand-orange transition-colors flex-shrink-0">
                      {copied === 'wallet' ? '✓' : '⎘'}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={connectPhantom} disabled={walletConnecting}
                  className="w-full flex items-center justify-center gap-2 border border-[#AB9FF2]/30 bg-[#AB9FF2]/10 text-[#AB9FF2] font-mono text-[10px] tracking-widest uppercase py-3 hover:bg-[#AB9FF2]/20 transition-all disabled:opacity-50 rounded">
                  {walletConnecting ? <span className="w-3 h-3 border border-[#AB9FF2]/30 border-t-[#AB9FF2] rounded-full animate-spin" /> : '◎'}
                  {walletConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
            </div>

            {/* Frontier Pass export */}
            <div className="bg-brand-surface border border-brand-border rounded p-6">
              <div className="font-mono text-[10px] text-brand-muted tracking-widest uppercase mb-1">Frontier Pass Integration</div>
              <p className="font-mono text-[11px] text-brand-muted leading-5 mb-4">Export your verified identity as a structured JSON payload for opportunity platforms.</p>
              <button onClick={handleExport} disabled={exporting || !passport}
                className="w-full flex items-center justify-center gap-2 font-syne font-bold text-xs tracking-widest uppercase bg-brand-gold text-brand-dark py-3 hover:brightness-110 transition-all disabled:opacity-50">
                {exporting ? <span className="w-4 h-4 border border-brand-dark/20 border-t-brand-dark rounded-full animate-spin" /> : null}
                {exporting ? 'Preparing...' : exported ? '✓ Downloaded!' : '↓ Export Profile JSON'}
              </button>
              <div className="mt-3">
                <div className="font-mono text-[8px] text-brand-muted tracking-widest uppercase mb-1">Shareable Link</div>
                <div className="flex items-center gap-2">
                  <div className="font-mono text-[9px] text-brand-teal flex-1 truncate">{profileUrl}</div>
                  <button onClick={() => copy(profileUrl, 'link')} className="font-mono text-[9px] text-brand-muted hover:text-brand-orange transition-colors flex-shrink-0">
                    {copied === 'link' ? '✓' : '⎘'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Verified Skills', skills.length, 'brand-orange'],
                ['NFTs Minted', minted, 'brand-teal'],
                ['Reputation', Number(passport?.trust_metrics?.reputation_score ?? 0).toFixed(0), 'brand-gold'],
              ].map(([l,v,c]) => (
                <div key={l} className="bg-brand-surface border border-brand-border rounded p-5 text-center">
                  <div className={`font-syne font-extrabold text-3xl text-${c} mb-1`}>{v}</div>
                  <div className="font-mono text-[10px] text-brand-muted tracking-widest uppercase">{l}</div>
                </div>
              ))}
            </div>

            {/* Credentials */}
            <div>
              <div className="font-mono text-[10px] text-brand-muted tracking-widest uppercase mb-4">Verified Credentials</div>
              {skills.length === 0 ? (
                <div className="text-center py-12 border border-brand-border rounded bg-brand-surface">
                  <div className="text-3xl mb-3">◎</div>
                  <div className="font-mono text-[11px] text-brand-muted">No verified credentials yet. Submit a skill to get started.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {skills.map(s => <CredentialBadge key={s.id} skill={s} />)}
                </div>
              )}
            </div>

            {/* Passport JSON preview */}
            {passport && (
              <div className="rounded border border-brand-border overflow-hidden" style={{background:'#030201'}}>
                <div className="flex items-center gap-2 border-b border-brand-teal/10 bg-brand-teal/[.04] px-5 py-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                  <span className="ml-auto font-mono text-[9px] text-brand-muted tracking-widest">frontier-pass export · live data</span>
                </div>
                <pre className="p-5 font-mono text-[10px] leading-6 overflow-x-auto max-h-60 text-brand-muted">
{`  {
    `}<span className="t-key">"export_format"</span>{` : `}<span className="t-str">"NeuroPass-v1"</span>{`,
    `}<span className="t-key">"user"</span>{`         : {
      `}<span className="t-key">"username"</span>{`       : `}<span className="t-str">"{passport?.user?.username}"</span>{`,
      `}<span className="t-key">"wallet_address"</span>{` : `}<span className="t-addr">"{passport?.user?.wallet_address || 'not linked'}"</span>{`
    },
    `}<span className="t-key">"trust_metrics"</span>{` : {
      `}<span className="t-key">"reputation_score"</span>{` : `}<span className="t-num">{passport?.trust_metrics?.reputation_score ?? 0}</span>{`,
      `}<span className="t-key">"is_verifier"</span>{`     : `}<span className="t-num">{String(passport?.trust_metrics?.is_verifier)}</span>{`
    },
    `}<span className="t-key">"verified_skills"</span>{` : `}<span className="t-num">[{skills.length} credentials]</span>{`
  }`}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
