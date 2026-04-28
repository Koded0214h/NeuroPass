import { useState, useEffect } from 'react'
import { verifier as verifierApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function QueueCard({ item, onAction }) {
  const [expanded, setExpanded] = useState(false)
  const [rejReason, setRejReason] = useState('')
  const [showing, setShowing] = useState(null)
  const [acting, setActing] = useState(false)

  const fileType = item.file_ipfs_hash ? 'IPFS File' : 'No file'

  const doAction = async (decision) => {
    setActing(true)
    try {
      await onAction(item.id, decision, rejReason)
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="bg-brand-surface border border-brand-border rounded overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="font-syne font-bold text-lg text-brand-text">{item.name}</div>
              <span className="font-mono text-[9px] text-brand-muted border border-brand-border rounded-full px-2 py-0.5 tracking-widest uppercase">{item.skill_level || 'Unknown'}</span>
            </div>
            <div className="font-mono text-[11px] text-brand-muted">by {item.user?.username || 'Unknown'}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-mono text-[9px] text-brand-muted">{new Date(item.submitted_at).toLocaleDateString()}</div>
            <div className="flex items-center gap-1 justify-end mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-badgePing" />
              <span className="font-mono text-[9px] text-brand-gold tracking-widest uppercase">Pending Review</span>
            </div>
          </div>
        </div>

        <p className="font-mono text-[11px] text-brand-muted leading-6 mb-4">{item.description}</p>

        <div className="flex flex-wrap gap-4 mb-4">
          {item.file_sha256 && (
            <div>
              <span className="font-mono text-[9px] text-brand-muted">Hash: </span>
              <span className="font-mono text-[10px] text-brand-teal">{item.file_sha256.slice(0,16)}...{item.file_sha256.slice(-8)}</span>
            </div>
          )}
          {item.file_ipfs_hash && (
            <div>
              <span className="font-mono text-[9px] text-brand-muted">IPFS: </span>
              <a href={`https://ipfs.io/ipfs/${item.file_ipfs_hash}`} target="_blank" rel="noopener noreferrer"
                className="font-mono text-[10px] text-brand-orange hover:underline">
                {item.file_ipfs_hash.slice(0,12)}...↗
              </a>
            </div>
          )}
          {item.tags?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {item.tags.map(t => <span key={t} className="font-mono text-[9px] text-brand-muted border border-brand-border px-2 py-0.5">{t}</span>)}
            </div>
          )}
        </div>

        <button onClick={() => setExpanded(e => !e)}
          className="font-mono text-[10px] text-brand-orange tracking-widest uppercase hover:underline">
          {expanded ? 'Hide Actions ↑' : 'Review & Decide ↓'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-brand-border p-6 bg-brand-dark/50">
          <div className="font-mono text-[10px] text-brand-muted tracking-widest uppercase mb-4">Verification Decision</div>

          {!showing && (
            <div className="flex gap-3">
              <button onClick={() => { setShowing('approve'); setRejReason('') }}
                className="flex-1 flex items-center justify-center gap-2 bg-brand-teal/10 border border-brand-teal/30 text-brand-teal font-mono text-[11px] tracking-widest uppercase py-3 hover:bg-brand-teal/20 transition-colors">
                ✓ Approve
              </button>
              <button onClick={() => setShowing('reject')}
                className="flex-1 flex items-center justify-center gap-2 bg-red-400/10 border border-red-400/30 text-red-400 font-mono text-[11px] tracking-widest uppercase py-3 hover:bg-red-400/20 transition-colors">
                ✗ Reject
              </button>
            </div>
          )}

          {showing === 'approve' && (
            <div className="space-y-4">
              <div className="rounded border border-brand-teal/20 bg-brand-teal/5 p-4 font-mono text-[11px] text-brand-teal">
                ✓ Approving will trigger NFT minting on Solana Devnet. Your wallet is recorded as verifier.
              </div>
              <div className="flex gap-3">
                <button onClick={() => doAction('approve')} disabled={acting}
                  className="flex-1 bg-brand-teal text-brand-dark font-syne font-bold text-xs tracking-widest uppercase py-3 hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {acting ? <span className="w-4 h-4 border border-brand-dark/20 border-t-brand-dark rounded-full animate-spin" /> : null}
                  {acting ? 'Processing...' : 'Confirm Approval'}
                </button>
                <button onClick={() => setShowing(null)} className="px-6 font-mono text-[11px] text-brand-muted border border-brand-border py-3 hover:text-brand-text transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {showing === 'reject' && (
            <div className="space-y-4">
              <div>
                <label className="font-mono text-[10px] text-brand-muted tracking-widest uppercase mb-2 block">Rejection Reason *</label>
                <textarea value={rejReason} onChange={e => setRejReason(e.target.value)} rows={3}
                  placeholder="Explain why this submission cannot be verified..."
                  className="w-full bg-brand-surface border border-brand-border rounded px-4 py-3 font-mono text-sm text-brand-text placeholder-brand-muted/40 focus:outline-none focus:border-red-400/30 transition-colors resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => doAction('reject')} disabled={acting || !rejReason.trim()}
                  className="flex-1 bg-red-500/20 border border-red-400/30 text-red-400 font-syne font-bold text-xs tracking-widest uppercase py-3 hover:bg-red-500/30 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  {acting ? <span className="w-4 h-4 border border-red-400/30 border-t-red-400 rounded-full animate-spin" /> : null}
                  {acting ? 'Processing...' : 'Confirm Rejection'}
                </button>
                <button onClick={() => setShowing(null)} className="px-6 font-mono text-[11px] text-brand-muted border border-brand-border py-3 hover:text-brand-text transition-colors">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function VerifierPanel() {
  const { user } = useAuth()
  const [queue, setQueue] = useState([])
  const [reviewed, setReviewed] = useState([])
  const [tab, setTab] = useState('queue')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    verifierApi.queue()
      .then(data => setQueue(data.results || data))
      .catch(() => setError('Failed to load queue'))
      .finally(() => setLoading(false))
  }, [])

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const handleAction = async (id, decision, comment) => {
    await verifierApi.decide(id, decision, comment)
    const item = queue.find(q => q.id === id)
    setQueue(q => q.filter(i => i.id !== id))
    setReviewed(r => [{ ...item, _decision: decision, _decidedAt: new Date().toISOString() }, ...r])
    showToast(decision === 'approve' ? '✓ Approved — NFT minting triggered on Solana' : '✗ Submission rejected')
  }

  const pendingCount = queue.length
  const approvedCount = reviewed.filter(r => r._decision === 'approve').length

  return (
    <div className="min-h-screen bg-brand-dark pt-20">
      <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse 50% 35% at 50% 0%, rgba(242,193,78,.03) 0%, transparent 60%)'}} />

      {toast && (
        <div className="fixed top-24 right-6 z-50 bg-brand-surface border border-brand-border rounded px-5 py-3 font-mono text-[11px] text-brand-text shadow-2xl animate-fadeUp0">
          {toast}
        </div>
      )}

      <div className="relative max-w-4xl mx-auto px-6 lg:px-8 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-4 font-mono text-[10px] text-brand-gold tracking-widest uppercase mb-4">
            <span className="w-8 h-px bg-brand-gold" />Verifier Panel
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="font-syne font-extrabold text-4xl text-brand-text tracking-tight">Skill <span className="text-brand-gold">Verifier</span></h1>
              <p className="font-mono text-[11px] text-brand-muted mt-2">
                {user?.username} · Reputation: {user?.profile?.reputation_score ?? 0}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-center border border-brand-border rounded px-5 py-3 bg-brand-surface">
                <div className="font-syne font-extrabold text-2xl text-brand-gold">{pendingCount}</div>
                <div className="font-mono text-[9px] text-brand-muted tracking-widest uppercase">Pending</div>
              </div>
              <div className="text-center border border-brand-border rounded px-5 py-3 bg-brand-surface">
                <div className="font-syne font-extrabold text-2xl text-brand-teal">{approvedCount}</div>
                <div className="font-mono text-[9px] text-brand-muted tracking-widest uppercase">Approved</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 flex items-center gap-3 bg-brand-gold/5 border border-brand-gold/20 rounded px-5 py-3">
          <span className="text-brand-gold flex-shrink-0">◈</span>
          <div className="font-mono text-[11px] text-brand-muted">
            You have <span className="text-brand-gold font-bold">Verifier</span> role. Approvals trigger NFT minting on-chain with your wallet as verifier. You cannot verify your own submissions.
          </div>
        </div>

        <div className="flex gap-0 mb-6 border border-brand-border rounded overflow-hidden">
          {[['queue', `Queue (${pendingCount})`], ['reviewed', `Reviewed (${reviewed.length})`]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex-1 py-3 font-mono text-[11px] tracking-widest uppercase transition-all ${tab === k ? 'bg-brand-gold/10 text-brand-gold border-b-2 border-brand-gold' : 'text-brand-muted hover:text-brand-text'}`}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'queue' && (
          <div className="space-y-4">
            {loading && (
              <div className="flex items-center justify-center py-16 gap-3">
                <div className="w-6 h-6 border border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
                <span className="font-mono text-[11px] text-brand-muted">Loading queue...</span>
              </div>
            )}
            {error && <div className="font-mono text-[11px] text-red-400 text-center py-10">{error}</div>}
            {!loading && !error && queue.length === 0 && (
              <div className="text-center py-16 border border-brand-border rounded bg-brand-surface">
                <div className="text-4xl mb-4">✓</div>
                <div className="font-syne font-bold text-brand-text mb-2">All caught up!</div>
                <div className="font-mono text-[11px] text-brand-muted">No pending submissions in the queue.</div>
              </div>
            )}
            {queue.map(item => <QueueCard key={item.id} item={item} onAction={handleAction} />)}
          </div>
        )}

        {tab === 'reviewed' && (
          <div className="space-y-3">
            {reviewed.length === 0 && (
              <div className="text-center py-16 border border-brand-border rounded bg-brand-surface">
                <div className="font-mono text-[11px] text-brand-muted">No reviews yet this session.</div>
              </div>
            )}
            {reviewed.map(item => (
              <div key={item.id} className="bg-brand-surface border border-brand-border rounded p-5 flex items-center gap-5">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${item._decision === 'approve' ? 'bg-brand-teal/20 text-brand-teal' : 'bg-red-400/20 text-red-400'}`}>
                  {item._decision === 'approve' ? '✓' : '✗'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-syne font-bold text-brand-text">{item.name}</div>
                  <div className="font-mono text-[10px] text-brand-muted">by {item.user?.username}</div>
                </div>
                <div className={`font-mono text-[10px] tracking-widest uppercase flex-shrink-0 ${item._decision === 'approve' ? 'text-brand-teal' : 'text-red-400'}`}>
                  {item._decision === 'approve' ? 'Approved' : 'Rejected'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
