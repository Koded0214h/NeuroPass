import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { skills as skillsApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const STATUS_CFG = {
  submitted: { label: 'Pending', cls: 'text-brand-gold border-brand-gold/30 bg-brand-gold/5' },
  verified:  { label: 'Verified', cls: 'text-brand-teal border-brand-teal/30 bg-brand-teal/5' },
  rejected:  { label: 'Rejected', cls: 'text-red-400 border-red-400/30 bg-red-400/5' },
}

function StatCard({ label, value, accent = 'brand-orange' }) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded p-6">
      <div className={`font-syne font-extrabold text-3xl text-${accent} mb-1`}>{value}</div>
      <div className="font-mono text-[10px] text-brand-muted tracking-widest uppercase">{label}</div>
    </div>
  )
}

function SkillCard({ skill }) {
  const cfg = STATUS_CFG[skill.status] || STATUS_CFG.submitted
  const cred = skill.credential

  return (
    <div className="skill-card group bg-brand-surface border border-brand-border rounded p-6 transition-all duration-300 hover:border-brand-orange/30 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-syne font-bold text-lg text-brand-text mb-0.5">{skill.name}</div>
          <div className="font-mono text-[10px] text-brand-orange tracking-widest uppercase">{skill.skill_level || 'Intermediate'}</div>
        </div>
        <span className={`font-mono text-[9px] tracking-widest uppercase border rounded-full px-2.5 py-1 flex-shrink-0 ${cfg.cls}`}>{cfg.label}</span>
      </div>

      {skill.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {skill.tags.map(t => (
            <span key={t} className="font-mono text-[9px] text-brand-muted border border-brand-border px-2 py-0.5">{t}</span>
          ))}
        </div>
      )}

      <div className="h-px bg-brand-border mb-4" />

      <div className="space-y-2 mb-4">
        <div>
          <div className="font-mono text-[8px] text-brand-muted tracking-widest uppercase mb-0.5">Submitted</div>
          <div className="font-mono text-[10px] text-brand-text">{new Date(skill.submitted_at).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})}</div>
        </div>
        {skill.file_sha256 && (
          <div>
            <div className="font-mono text-[8px] text-brand-muted tracking-widest uppercase mb-0.5">Proof Hash</div>
            <div className="font-mono text-[10px] text-brand-teal truncate">{skill.file_sha256.slice(0,16)}...{skill.file_sha256.slice(-8)}</div>
          </div>
        )}
        {cred?.mint_address && (
          <div>
            <div className="font-mono text-[8px] text-brand-muted tracking-widest uppercase mb-0.5">NFT Mint</div>
            <a href={`https://explorer.solana.com/address/${cred.mint_address}?cluster=devnet`} target="_blank" rel="noreferrer"
              className="font-mono text-[10px] text-brand-teal truncate hover:underline block">
              {cred.mint_address.slice(0,16)}...{cred.mint_address.slice(-6)}
            </a>
          </div>
        )}
        {cred?.transaction_signature && (
          <div>
            <div className="font-mono text-[8px] text-brand-muted tracking-widest uppercase mb-0.5">Tx Signature</div>
            <a href={`https://explorer.solana.com/tx/${cred.transaction_signature}?cluster=devnet`} target="_blank" rel="noreferrer"
              className="font-mono text-[10px] text-brand-teal truncate hover:underline block">
              {cred.transaction_signature.slice(0,16)}...{cred.transaction_signature.slice(-6)}
            </a>
          </div>
        )}
      </div>

      {skill.status === 'submitted' && (
        <div className="rounded border border-brand-gold/20 bg-brand-gold/5 px-3 py-2 font-mono text-[10px] text-brand-gold">
          ⏳ Awaiting verifier review
        </div>
      )}
      {skill.status === 'verified' && !cred && (
        <div className="rounded border border-brand-teal/20 bg-brand-teal/5 px-3 py-2 font-mono text-[10px] text-brand-teal">
          ✓ Verified — NFT minting in progress
        </div>
      )}
      {skill.status === 'rejected' && (
        <div className="rounded border border-red-400/20 bg-red-400/5 px-3 py-2 font-mono text-[10px] text-red-400">
          ✗ Submission rejected — you may resubmit
        </div>
      )}
      {cred?.mint_address && (
        <div className="flex gap-2">
          <a href={`https://explorer.solana.com/tx/${cred.transaction_signature}?cluster=devnet`} target="_blank" rel="noreferrer"
            className="flex-1 text-center font-mono text-[10px] tracking-widest uppercase border border-brand-teal/30 text-brand-teal py-2 hover:bg-brand-teal/10 transition-colors">
            ↗ Explorer
          </a>
          <Link to="/profile" className="flex-1 text-center font-mono text-[10px] tracking-widest uppercase border border-brand-orange/30 text-brand-orange py-2 hover:bg-brand-orange/10 transition-colors">
            Share
          </Link>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { user, walletAddress, connectPhantom, walletConnecting } = useAuth()
  const [filter, setFilter] = useState('all')
  const [allSkills, setAllSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    skillsApi.list()
      .then(data => setAllSkills(data.results || data))
      .catch(() => setError('Failed to load skills'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? allSkills : allSkills.filter(s => s.status === filter)
  const minted = allSkills.filter(s => s.credential?.mint_address).length
  const verified = allSkills.filter(s => s.status === 'verified').length
  const pending = allSkills.filter(s => s.status === 'submitted').length

  return (
    <div className="min-h-screen bg-brand-dark pt-20">
      <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(232,98,42,.04) 0%, transparent 60%)'}} />

      <div className="relative max-w-5xl mx-auto px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 font-mono text-[10px] text-brand-teal tracking-widest uppercase mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-badgePing" />
              Connected · Solana Devnet
            </div>
            <h1 className="font-syne font-extrabold text-4xl text-brand-text tracking-tight">Your Dashboard</h1>
            <p className="font-mono text-[11px] text-brand-muted mt-2">
              {walletAddress
                ? <><span className="text-brand-teal">{walletAddress.slice(0,8)}...{walletAddress.slice(-6)}</span> · {user?.username}</>
                : user?.username}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {!walletAddress && (
              <button onClick={connectPhantom} disabled={walletConnecting}
                className="inline-flex items-center gap-2 border border-[#AB9FF2]/30 bg-[#AB9FF2]/10 text-[#AB9FF2] font-mono text-[10px] tracking-widest uppercase px-5 py-3 hover:bg-[#AB9FF2]/20 transition-all disabled:opacity-50 self-start">
                {walletConnecting ? <span className="w-3 h-3 border border-[#AB9FF2]/30 border-t-[#AB9FF2] rounded-full animate-spin" /> : '◎'}
                {walletConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
            <Link to="/submit" className="inline-flex items-center gap-2 bg-brand-orange text-white font-syne font-bold text-xs tracking-widest uppercase px-7 py-3 hover:brightness-110 transition-all self-start" style={{boxShadow:'0 8px 30px rgba(232,98,42,.2)'}}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              Submit Skill
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          <StatCard label="Submitted" value={allSkills.length} />
          <StatCard label="NFTs Minted" value={minted} accent="brand-teal" />
          <StatCard label="Verified" value={verified} accent="brand-gold" />
          <StatCard label="Pending" value={pending} accent="brand-muted" />
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {[['all','All'],['submitted','Pending'],['verified','Verified'],['rejected','Rejected']].map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`font-mono text-[10px] tracking-widest uppercase px-4 py-2 border transition-all ${filter===k ? 'border-brand-orange bg-brand-orange/10 text-brand-orange' : 'border-brand-border text-brand-muted hover:text-brand-text'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Skills */}
        {loading && (
          <div className="flex items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
            <span className="font-mono text-[11px] text-brand-muted">Loading skills...</span>
          </div>
        )}
        {error && <div className="font-mono text-[11px] text-red-400 text-center py-10">{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-20 border border-brand-border rounded bg-brand-surface">
            <div className="text-4xl mb-4">◎</div>
            <div className="font-syne font-bold text-brand-text mb-2">No skills yet</div>
            <p className="font-mono text-[11px] text-brand-muted mb-6">Submit your first skill proof to get started.</p>
            <Link to="/submit" className="font-mono text-[11px] tracking-widest uppercase text-brand-orange border border-brand-orange/30 px-6 py-2.5 hover:bg-brand-orange/10 transition-colors">
              Submit a Skill →
            </Link>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {filtered.map(skill => <SkillCard key={skill.id} skill={skill} />)}
          </div>
        )}

        {/* Quick actions */}
        <div className="border border-brand-border rounded p-6 bg-brand-surface">
          <div className="font-mono text-[10px] text-brand-muted tracking-widest uppercase mb-4">Quick Actions</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {label:'Submit Skill', to:'/submit', icon:'↑'},
              {label:'Verify Credential', to:'/verify', icon:'◎'},
              {label:'Export Profile', to:'/profile', icon:'↗'},
              {label:'Verifier Panel', to:'/verifier', icon:'✓'},
            ].map(({label, to, icon}) => (
              <Link key={to} to={to} className="flex flex-col items-center gap-2 border border-brand-border bg-brand-dark rounded p-4 hover:border-brand-orange/30 hover:bg-brand-orange/5 transition-all group">
                <span className="font-syne font-bold text-xl text-brand-orange group-hover:scale-110 transition-transform">{icon}</span>
                <span className="font-mono text-[10px] text-brand-muted group-hover:text-brand-text text-center transition-colors">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


