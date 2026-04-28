import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { skills as skillsApi } from '../lib/api'

const SKILL_TAGS = ['Welding', 'Electrical', 'Carpentry', 'Plumbing', 'Tailoring', 'Coding', 'Design', 'Farming', 'Cooking', 'Teaching', 'Healthcare', 'Mechanics']

function ProgressBar({ step }) {
  const steps = ['Details', 'Upload Proof', 'Review']
  return (
    <div className="flex items-center gap-0 mb-12">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center flex-1 last:flex-none">
          <div className={`flex items-center gap-2 ${i <= step ? 'text-brand-orange' : 'text-brand-muted'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-[10px] font-bold border transition-all ${i < step ? 'bg-brand-orange border-brand-orange text-white' : i === step ? 'border-brand-orange text-brand-orange' : 'border-brand-border text-brand-muted'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className="font-mono text-[10px] tracking-widest uppercase hidden sm:block">{s}</span>
          </div>
          {i < steps.length - 1 && <div className={`flex-1 h-px mx-3 transition-all ${i < step ? 'bg-brand-orange' : 'bg-brand-border'}`} />}
        </div>
      ))}
    </div>
  )
}

function Step1({ form, setForm }) {
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState(null)

  const handleAI = async () => {
    if (!form.name) return
    setAiLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setAiSuggestion({
      description: `Professional ${form.name} practitioner with demonstrable hands-on experience. Capable of working with industry-standard tools and following safety protocols. Skilled in project estimation, material selection, and quality finishing.`,
      tags: ['Manufacturing', 'Practical Skills', 'Safety'],
      level: 'Intermediate',
    })
    setAiLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block font-mono text-[10px] text-brand-muted tracking-widest uppercase mb-2">Skill Name *</label>
        <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required
          placeholder="e.g. Arc Welding, Web Development, Tailoring..."
          className="w-full bg-brand-dark border border-brand-border rounded px-4 py-3 font-mono text-sm text-brand-text placeholder-brand-muted/40 focus:outline-none focus:border-brand-orange/50 transition-colors" />
        <div className="flex flex-wrap gap-2 mt-3">
          {SKILL_TAGS.map(t => (
            <button key={t} type="button" onClick={() => setForm(f => ({...f, name: t}))}
              className={`font-mono text-[9px] tracking-widest uppercase px-2.5 py-1 border rounded-full transition-all ${form.name === t ? 'border-brand-orange bg-brand-orange/10 text-brand-orange' : 'border-brand-border text-brand-muted hover:border-brand-orange/30'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-mono text-[10px] text-brand-muted tracking-widest uppercase">Description *</label>
          <button type="button" onClick={handleAI} disabled={!form.name || aiLoading}
            className="flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase text-brand-teal border border-brand-teal/30 px-3 py-1.5 hover:bg-brand-teal/10 transition-all disabled:opacity-40">
            {aiLoading ? <span className="w-3 h-3 border border-brand-teal/30 border-t-brand-teal rounded-full animate-spin" /> : '✦'}
            {aiLoading ? 'Generating...' : 'AI Assist (YarnGPT)'}
          </button>
        </div>
        <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} required rows={5}
          placeholder="Describe your skill, experience, and what you can do..."
          className="w-full bg-brand-dark border border-brand-border rounded px-4 py-3 font-mono text-sm text-brand-text placeholder-brand-muted/40 focus:outline-none focus:border-brand-orange/50 transition-colors resize-none" />

        {aiSuggestion && (
          <div className="mt-3 rounded border border-brand-teal/20 bg-brand-teal/5 p-4">
            <div className="font-mono text-[9px] text-brand-teal tracking-widest uppercase mb-3">✦ YarnGPT Suggestion</div>
            <p className="font-mono text-[11px] text-brand-muted leading-6 mb-3">{aiSuggestion.description}</p>
            <button type="button" onClick={() => setForm(f => ({...f, description: aiSuggestion.description}))}
              className="font-mono text-[10px] tracking-widest uppercase text-brand-teal hover:underline">
              Apply suggestion →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Step2({ form, setForm }) {
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)
  const ALLOWED = ['video/mp4','video/webm','video/quicktime','image/jpeg','image/png','application/pdf','text/plain','application/zip']

  const handleFile = f => {
    if (!f) return
    if (!ALLOWED.includes(f.type)) { alert('Unsupported file type'); return }
    if (f.size > 50 * 1024 * 1024) { alert('File exceeds 50 MB limit'); return }
    setForm(fo => ({...fo, file: f}))
  }

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] text-brand-muted tracking-widest uppercase mb-4">Upload Proof of Skill</div>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`relative border-2 border-dashed rounded p-12 text-center cursor-pointer transition-all ${dragging ? 'border-brand-orange bg-brand-orange/5' : form.file ? 'border-brand-teal/50 bg-brand-teal/5' : 'border-brand-border hover:border-brand-orange/40 hover:bg-brand-orange/5'}`}>
          <input ref={fileRef} type="file" className="hidden"
            accept="video/mp4,video/webm,video/quicktime,image/jpeg,image/png,application/pdf,text/plain,application/zip"
            onChange={e => handleFile(e.target.files[0])} />
          {form.file ? (
            <div className="space-y-2">
              <div className="text-3xl text-brand-teal">✓</div>
              <div className="font-syne font-bold text-brand-teal">{form.file.name}</div>
              <div className="font-mono text-[10px] text-brand-muted">{(form.file.size / 1024 / 1024).toFixed(2)} MB</div>
              <button type="button" onClick={e => { e.stopPropagation(); setForm(f => ({...f, file: null})) }}
                className="font-mono text-[10px] text-brand-orange hover:underline mt-2">Remove file</button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-4xl text-brand-muted">↑</div>
              <div className="font-syne font-bold text-brand-text">Drop your proof here</div>
              <div className="font-mono text-[11px] text-brand-muted">Video, PDF, Image, ZIP · Max 50MB</div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded border border-brand-border bg-brand-surface p-4">
        <div className="font-mono text-[10px] text-brand-muted tracking-widest uppercase mb-3">What happens to your file</div>
        <ul className="space-y-2">
          {['Your file is uploaded to IPFS via Pinata','A SHA-256 hash is generated from the file content','Both hash and IPFS CID are stored on-chain','Your proof cannot be altered without detection'].map((t,i) => (
            <li key={i} className="flex gap-3 font-mono text-[11px] text-brand-muted">
              <span className="text-brand-teal flex-shrink-0">→</span>{t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Step3({ form }) {
  return (
    <div className="space-y-5">
      <div className="rounded border border-brand-border bg-brand-surface p-6">
        <div className="font-mono text-[10px] text-brand-muted tracking-widest uppercase mb-5">Skill Details</div>
        <div className="space-y-3">
          <div>
            <div className="font-mono text-[9px] text-brand-muted tracking-widest uppercase mb-1">Skill Name</div>
            <div className="font-syne font-bold text-lg text-brand-text">{form.name || '—'}</div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-brand-muted tracking-widest uppercase mb-1">Description</div>
            <div className="font-mono text-[11px] text-brand-text leading-6">{form.description || '—'}</div>
          </div>
        </div>
      </div>

      {form.file && (
        <div className="rounded border border-brand-teal/20 bg-brand-teal/5 p-5">
          <div className="font-mono text-[10px] text-brand-muted tracking-widest uppercase mb-3">Proof File</div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded border border-brand-teal/20 flex items-center justify-center text-brand-teal text-lg">↑</div>
            <div>
              <div className="font-mono text-sm text-brand-text">{form.file.name}</div>
              <div className="font-mono text-[10px] text-brand-muted">{(form.file.size / 1024 / 1024).toFixed(2)} MB · Will be hashed + pinned to IPFS</div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded border border-brand-orange/20 bg-brand-orange/5 p-5">
        <div className="font-mono text-[10px] text-brand-orange tracking-widest uppercase mb-3">What happens after submission</div>
        <ul className="space-y-2">
          {['File is pinned to IPFS and SHA-256 hashed','AI (YarnGPT) analyses and tags your skill','Submission enters the verifier queue','Upon approval, an NFT is minted to your wallet'].map((t,i) => (
            <li key={i} className="flex gap-3 font-mono text-[11px] text-brand-muted">
              <span className="text-brand-orange font-bold">{i+1}.</span>{t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function SubmitSkill() {
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [apiError, setApiError] = useState('')
  const [form, setForm] = useState({ name: '', description: '', file: null })
  const navigate = useNavigate()

  const canNext = () => {
    if (step === 0) return form.name.trim() && form.description.trim()
    if (step === 1) return !!form.file
    return true
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setApiError('')
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('description', form.description)
      fd.append('file', form.file)
      const data = await skillsApi.submit(fd)
      setResult(data)
    } catch (err) {
      setApiError(err.data?.file?.[0] || err.data?.detail || err.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-6 pt-20">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto rounded-full border-2 border-brand-teal bg-brand-teal/10 flex items-center justify-center text-3xl text-brand-teal mb-8">✓</div>
          <h2 className="font-syne font-extrabold text-3xl text-brand-text mb-3">Skill Submitted!</h2>
          <p className="font-mono text-sm text-brand-muted leading-6 mb-8">
            Your proof is now on IPFS and in the verification queue. YarnGPT has analysed your submission. You'll be notified once a validator reviews it.
          </p>
          <div className="rounded border border-brand-border bg-brand-surface p-5 mb-8 text-left space-y-3">
            <div>
              <div className="font-mono text-[9px] text-brand-muted tracking-widest uppercase mb-1">Skill</div>
              <div className="font-syne font-bold text-brand-text">{result.name}</div>
            </div>
            <div>
              <div className="font-mono text-[9px] text-brand-muted tracking-widest uppercase mb-1">AI-Assigned Level</div>
              <div className="font-mono text-[11px] text-brand-orange">{result.skill_level}</div>
            </div>
            {result.tags?.length > 0 && (
              <div>
                <div className="font-mono text-[9px] text-brand-muted tracking-widest uppercase mb-2">Tags</div>
                <div className="flex flex-wrap gap-1.5">
                  {result.tags.map(t => <span key={t} className="font-mono text-[9px] text-brand-teal border border-brand-teal/20 px-2 py-0.5">{t}</span>)}
                </div>
              </div>
            )}
            <div>
              <div className="font-mono text-[9px] text-brand-muted tracking-widest uppercase mb-1">Status</div>
              <div className="font-mono text-[11px] text-brand-gold">{result.status}</div>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setResult(null); setStep(0); setForm({ name:'', description:'', file:null }) }}
              className="font-mono text-[11px] tracking-widest uppercase border border-brand-border text-brand-muted px-6 py-3 hover:text-brand-text transition-colors">
              Submit Another
            </button>
            <button onClick={() => navigate('/dashboard')}
              className="font-syne font-bold text-xs tracking-widest uppercase bg-brand-orange text-white px-8 py-3 hover:brightness-110 transition-all">
              View Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-dark pt-20">
      <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse 50% 40% at 50% 0%, rgba(7,200,181,.04) 0%, transparent 60%)'}} />
      <div className="relative max-w-2xl mx-auto px-6 lg:px-8 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-4 font-mono text-[10px] text-brand-teal tracking-widest uppercase mb-4">
            <span className="w-8 h-px bg-brand-teal" />Submit Proof of Skill
          </div>
          <h1 className="font-syne font-extrabold text-4xl text-brand-text tracking-tight">Prove Your <span className="text-brand-orange">Craft</span></h1>
          <p className="font-mono text-[11px] text-brand-muted mt-2">Upload evidence · Get verified by a validator · Receive an NFT on Solana</p>
        </div>

        <ProgressBar step={step} />

        <div className="bg-brand-surface border border-brand-border rounded p-8 mb-6">
          {step === 0 && <Step1 form={form} setForm={setForm} />}
          {step === 1 && <Step2 form={form} setForm={setForm} />}
          {step === 2 && <Step3 form={form} />}
        </div>

        {apiError && (
          <div className="mb-4 rounded border border-red-400/20 bg-red-400/5 px-4 py-3 font-mono text-[11px] text-red-400">{apiError}</div>
        )}

        <div className="flex justify-between">
          {step > 0
            ? <button onClick={() => setStep(s => s - 1)} className="font-mono text-[11px] tracking-widest uppercase border border-brand-border text-brand-muted px-6 py-3 hover:text-brand-text transition-colors">← Back</button>
            : <div />}

          {step < 2
            ? <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                className="font-syne font-bold text-xs tracking-widest uppercase bg-brand-orange text-white px-8 py-3 hover:brightness-110 transition-all disabled:opacity-40">
                Continue →
              </button>
            : <button onClick={handleSubmit} disabled={submitting}
                className="font-syne font-bold text-xs tracking-widest uppercase bg-brand-orange text-white px-8 py-3 hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2">
                {submitting ? <><span className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />Submitting...</> : 'Submit to Blockchain →'}
              </button>}
        </div>
      </div>
    </div>
  )
}
