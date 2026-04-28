import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Box } from '@react-three/drei'

function useNetworkCanvas(ref) {
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf
    const resize = () => { canvas.width = canvas.offsetWidth || window.innerWidth; canvas.height = canvas.offsetHeight || window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    const nodes = Array.from({ length: 58 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28,
      r: Math.random() * 1.8 + .8, ph: Math.random() * Math.PI * 2,
    }))
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy; n.ph += .018
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * (.85 + .15 * Math.sin(n.ph)), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(232,98,42,${.3 + .25 * Math.sin(n.ph)})`; ctx.fill()
      })
      for (let i = 0; i < nodes.length; i++)
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 145) { ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.strokeStyle = `rgba(7,200,181,${(1 - d / 145) * .22})`; ctx.lineWidth = .6; ctx.stroke() }
        }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [ref])
}

function useScrollReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target) } })
    }, { threshold: .12 })
    document.querySelectorAll('.reveal,.reveal-l,.reveal-r,.stagger').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

function useCounters() {
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return
        const el = e.target, target = +el.dataset.count, sfx = el.dataset.sfx || ''
        let cur = 0; const step = target / 55
        const t = setInterval(() => { cur = Math.min(cur + step, target); el.textContent = Math.floor(cur) + sfx; if (cur >= target) clearInterval(t) }, 16)
        obs.unobserve(el)
      })
    }, { threshold: .5 })
    document.querySelectorAll('[data-count]').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

function RotatingBox({ rotationSpeed = { x: 0, y: 0.005 }, color = '#E8622A', ...props }) {
  const meshRef = useRef()
  useFrame(() => {
    if (meshRef.current) { meshRef.current.rotation.x += rotationSpeed.x || 0; meshRef.current.rotation.y += rotationSpeed.y || 0 }
  })
  return <Box ref={meshRef} args={[1, 1, 1]} {...props}><meshStandardMaterial color={color} /></Box>
}

const STATS = [
  ['70%', 'African workers in informal economy'],['200M+', 'Skilled workers without credentials'],
  ['SHA-256', 'Cryptographic proof hashing'],['Solana', '400ms finality · near-zero fees'],
  ['IPFS', 'Decentralised proof storage'],['Anchor', 'Custom Rust smart contracts'],
]

const STEPS = [
  { n:'01', title:'Submit Proof', tag:'IPFS + SHA-256', desc:'Upload a video, project, or document. The system generates a SHA-256 hash and pins your proof to IPFS — creating an immutable, content-addressed record.',
    icon: <svg className="w-11 h-11" viewBox="0 0 48 48" fill="none" stroke="#E8622A" strokeWidth="1.5"><rect x="8" y="6" width="32" height="36" rx="2"/><path d="M16 18h16M16 26h10"/><circle cx="34" cy="34" r="6" fill="rgba(232,98,42,.15)"/><path d="M32 34l1.5 1.5L36 32" strokeWidth="2"/></svg> },
  { n:'02', title:'Get Verified', tag:'Role-Based Access', desc:'A trusted validator — a mentor, teacher, or expert — reviews your submission. Their approval is recorded on-chain with their verifier reputation score.',
    icon: <svg className="w-11 h-11" viewBox="0 0 48 48" fill="none" stroke="#E8622A" strokeWidth="1.5"><circle cx="24" cy="16" r="8"/><path d="M12 40c0-6.627 5.373-12 12-12s12 5.373 12 12"/><path d="M32 22l3 3 5-5" stroke="#07C8B5" strokeWidth="2.5"/></svg> },
  { n:'03', title:'Own Your Credential', tag:'Solana NFT', desc:'A unique NFT credential is minted on Solana and sent to your wallet. It contains your proof hash, verifier identity, and is publicly verifiable by anyone — forever.',
    icon: <svg className="w-11 h-11" viewBox="0 0 48 48" fill="none" stroke="#E8622A" strokeWidth="1.5"><path d="M24 6l4.5 9 9.5 1.5-7 6.5 1.5 9.5-8.5-4.5-8.5 4.5 1.5-9.5-7-6.5 9.5-1.5z"/><circle cx="24" cy="40" r="4" fill="rgba(232,98,42,.15)"/></svg> },
]

const TECH = [
  { icon:'◎', name:'Solana', desc:'400ms block finality. Near-zero fees. NFT credentials minted via SPL Token standard on devnet.' },
  { icon:'⬡', name:'IPFS + Pinata', desc:'Proof files and metadata pinned to the decentralised web. Content-addressed — cannot be altered.' },
  { icon:'#', name:'SHA-256', desc:'Cryptographic hash of every proof file stored on-chain. Tamper-proof verification in milliseconds.' },
  { icon:'⚓', name:'Anchor / Rust', desc:'Custom on-chain program. SkillRecord, VerifierRecord, CredentialRecord PDAs all verified.' },
]

const WHO = [
  { e:'🔧', title:'Artisans & Tradespeople', desc:'Welders, electricians, carpenters, tailors — finally prove your craft to employers and clients who can\'t see you work in person.' },
  { e:'💻', title:'Self-Taught Developers', desc:'No CS degree? No problem. Submit your projects, get validated by community experts, own your credentials on Solana.' },
  { e:'🧠', title:'Neurodivergent Learners', desc:'Traditional education excluded you. NeuroPass recognises real ability regardless of how or where you learned it.' },
  { e:'🌍', title:'Opportunity Platforms', desc:'Integrate NeuroPass verified profiles via our Frontier Pass API. Trust your candidates before you hire them.' },
]

export default function Landing() {
  const [scrollY, setScrollY] = useState(0)
  const canvasRef = useRef(null), credRef = useRef(null), tagRef = useRef(null), bgRef = useRef(null)
  useNetworkCanvas(canvasRef)
  useScrollReveal()
  useCounters()

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    if (credRef.current) credRef.current.style.transform = `translate(0, calc(-50% + ${scrollY * .18}px))`
    if (tagRef.current)  tagRef.current.style.transform  = `translateY(${scrollY * .08}px)`
    if (bgRef.current)   bgRef.current.style.transform   = `translateY(${scrollY * .055}px)`
  }, [scrollY])

  const items = [...STATS, ...STATS]

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-brand-dark px-8 lg:px-12">
        <canvas ref={canvasRef} className="hero-canvas" />
        <div className="absolute inset-0 z-0">
          <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
            <pointLight position={[-10, -10, -10]} />
            <RotatingBox position={[3, 0, -2]} rotationSpeed={{ y: 0.005 }} color="#07C8B5" />
            <RotatingBox position={[-3, 2, -5]} rotationSpeed={{ x: 0.003 }} color="#F2C14E" />
            <OrbitControls enableZoom={false} />
          </Canvas>
        </div>
        <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse 55% 65% at 78% 50%, rgba(232,98,42,.07) 0%, transparent 60%), radial-gradient(ellipse 40% 50% at 18% 75%, rgba(7,200,181,.05) 0%, transparent 55%)'}} />
        <div className="absolute right-0 top-0 bottom-0 w-2/5 pointer-events-none" style={{backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(232,98,42,.04) 40px,rgba(232,98,42,.04) 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(232,98,42,.04) 40px,rgba(232,98,42,.04) 41px)'}} />

        <div className="relative z-10 max-w-4xl pt-24">
          <div className="animate-fadeUp0 inline-flex items-center gap-2 rounded-full border border-brand-teal/20 bg-brand-teal/5 px-4 py-1.5 mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-badgePing" />
            <span className="font-mono text-[10px] text-brand-teal tracking-[.2em] uppercase">Live on Solana Devnet</span>
          </div>
          <h1 className="font-syne font-extrabold leading-[.88] tracking-tight text-brand-text mb-8" style={{fontSize:'clamp(3.8rem,9vw,9rem)'}}>
            <span className="title-line"><span className="block animate-slideUp0">From</span></span>
            <span className="title-line"><span className="block animate-slideUp1 text-brand-orange">Invisible</span></span>
            <span className="title-line"><span className="block animate-slideUp2">Talent.</span></span>
          </h1>
          <p className="animate-fadeUp1 font-mono text-base text-brand-muted leading-relaxed max-w-2xl mb-14">
            NeuroPass converts real-world skills into verifiable blockchain credentials — giving Africa's informal workforce the recognition they deserve.
          </p>
          <div className="animate-fadeUp2 flex items-center gap-6 flex-wrap">
            <Link to="/auth" className="relative overflow-hidden font-syne font-bold text-xs tracking-[.2em] uppercase bg-brand-orange text-white px-10 py-5 group hover:-translate-y-0.5 transition-all duration-300" style={{boxShadow:'0 15px 45px rgba(232,98,42,0.1)'}}>
              <span className="relative z-10">Submit Your Skills</span>
              <span className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
            </Link>
            <Link to="/verify" className="flex items-center gap-3 font-mono text-[11px] text-brand-muted tracking-[.2em] uppercase hover:text-brand-text transition-colors group">
              Verify Credential
              <span className="group-hover:translate-x-1.5 transition-transform inline-block text-brand-orange">→</span>
            </Link>
          </div>
        </div>

        {/* Floating credential card */}
        <div className="cred-card-wrap animate-fadeLeft hidden lg:block" ref={credRef}>
          <div className="relative">
            <div className="absolute rounded top-5 left-5 -right-5 -bottom-5 border border-brand-orange/5 bg-brand-surface/60" />
            <div className="absolute rounded top-10 left-10 -right-10 -bottom-10 border border-brand-orange/[.03] bg-brand-dark/70" />
            <div className="relative z-10 w-[300px] rounded bg-gradient-to-br from-[#1A140E] to-[#0F0C07] border border-brand-orange/20 p-7 shadow-2xl" style={{boxShadow:'0 40px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.03)'}}>
              <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t" style={{background:'linear-gradient(90deg,#E8622A,#07C8B5)'}} />
              <div className="flex items-center justify-between mb-5">
                <span className="font-syne font-extrabold text-[10px] tracking-widest text-brand-text">NEURO<span className="text-brand-orange">PASS</span></span>
                <span className="font-mono text-[9px] text-brand-teal tracking-wider">✓ VERIFIED</span>
              </div>
              <div className="font-syne font-bold text-xl text-brand-text mb-0.5">Welding</div>
              <div className="font-mono text-[9px] text-brand-orange tracking-widest uppercase mb-5">Expert Level</div>
              <div className="h-px bg-brand-border mb-5" />
              {[['Verifier','mentor_adewale.sol'],['Proof Hash','a3f8d2c9...9c4e1b'],['Mint','E96QSb...Pd7z']].map(([l,v]) => (
                <div key={l} className="mb-3">
                  <div className="font-mono text-[8px] text-brand-muted tracking-widest uppercase mb-0.5">{l}</div>
                  <div className={`font-mono text-[10px] ${l !== 'Verifier' ? 'text-brand-teal' : 'text-brand-text'}`}>{v}</div>
                </div>
              ))}
              <div className="mt-5 rounded-sm border border-brand-orange/30 bg-brand-orange/10 py-2 text-center font-mono text-[9px] text-brand-orange tracking-wider">
                NFT CREDENTIAL · SOLANA DEVNET
              </div>
            </div>
          </div>
        </div>

        <div className="animate-fadeUpLg absolute bottom-24 left-8 lg:left-12 font-mono text-[10px] text-brand-muted" ref={tagRef}>
          <span className="text-brand-teal">F11FFZasp1pEGDaHoguWok</span> · program deployed
        </div>
        <div className="animate-fadeUpLg absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="font-mono text-[9px] text-brand-muted tracking-[.18em] uppercase" style={{writingMode:'vertical-rl'}}>Scroll</span>
          <div className="w-px h-14 animate-scrollPls" style={{background:'linear-gradient(to bottom, #E8622A, transparent)'}} />
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div className="overflow-hidden bg-brand-orange py-4">
        <div className="marquee-track animate-marquee">
          {items.map(([n, l], i) => (
            <span key={i} className="inline-flex items-center gap-10 px-10 whitespace-nowrap">
              <b className="font-syne font-extrabold text-base text-white tracking-tight">{n}</b>
              <span className="font-mono text-[11px] text-white/60 tracking-wide">{l}</span>
              <span className="text-white/25 text-lg">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── PROBLEM ── */}
      <section className="relative overflow-hidden bg-brand-cream py-40 px-8 lg:px-12">
        <div ref={bgRef} className="absolute -top-6 -left-4 font-syne font-extrabold text-black/[.04] pointer-events-none select-none leading-none" style={{fontSize:'24vw',letterSpacing:'-.05em'}}>WHY</div>
        <div className="relative max-w-5xl mx-auto">
          <div className="reveal flex items-center gap-4 font-mono text-[10px] text-brand-orange tracking-[.15em] uppercase mb-8">
            <span className="inline-block w-10 h-px bg-brand-orange" />The Problem
          </div>
          <blockquote className="reveal font-syne font-bold text-brand-dark leading-[1.15] tracking-tight mb-20" style={{fontSize:'clamp(2rem,4.2vw,3.6rem)'}}>
            Africa doesn't have a talent problem.<br />
            It has a <em className="not-italic text-brand-orange">recognition, trust,</em><br />
            and <em className="not-italic text-brand-orange">access</em> problem.
          </blockquote>
          <div className="stagger grid grid-cols-1 md:grid-cols-3 border border-black/10 divide-y md:divide-y-0 md:divide-x divide-black/10">
            {[
              {n:'70', sfx:'%', l:'of African workers operate in the informal economy with no way to prove their skills'},
              {n:'200', sfx:'M+', l:'skilled artisans, freelancers, and self-taught workers without verifiable credentials'},
              {n:'∞', sfx:'', l:'opportunities lost because talent cannot be trusted by employers and platforms'},
            ].map(({n,sfx,l}) => (
              <div key={n} className="p-10 lg:p-12 bg-brand-cream">
                <div className={`font-syne font-extrabold text-brand-orange leading-none mb-3 ${sfx === '' ? 'text-7xl' : ''}`}
                     style={sfx !== '' ? {fontSize:'clamp(3rem,5vw,4.5rem)'} : {}}
                     {...(sfx !== '' ? {'data-count':n,'data-sfx':sfx} : {})}>{n}{sfx}</div>
                <p className="font-mono text-[11px] text-[#5A4A3A] leading-6">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-brand-dark py-40 px-8 lg:px-12" id="how">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-end mb-24">
            <div>
              <div className="reveal flex items-center gap-4 font-mono text-[10px] text-brand-orange tracking-[.15em] uppercase mb-8">
                <span className="w-10 h-px bg-brand-orange" />How It Works
              </div>
              <h2 className="reveal font-syne font-extrabold leading-[1.02] tracking-tight text-brand-text" style={{fontSize:'clamp(2.5rem,5.5vw,4.8rem)'}}>
                Skill to<br /><span className="text-brand-teal">Chain</span><br />in 3 Steps
              </h2>
            </div>
            <p className="reveal font-mono text-sm text-brand-muted leading-7 pt-2">
              NeuroPass creates an unbreakable chain from the real world to the blockchain — transforming subjective skills into objective, cryptographically verifiable credentials.
            </p>
          </div>
          <div className="stagger grid grid-cols-1 md:grid-cols-3 gap-0.5">
            {STEPS.map(s => (
              <div key={s.n} className="step-card group bg-brand-surface p-10 transition-transform duration-300 hover:-translate-y-1 cursor-default">
                <div className="font-syne font-extrabold text-7xl text-white/[.04] leading-none mb-6 tracking-tighter">{s.n}</div>
                <div className="mb-6">{s.icon}</div>
                <div className="font-syne font-bold text-lg text-brand-text mb-3 tracking-tight">{s.title}</div>
                <p className="font-mono text-[11px] text-brand-muted leading-6 mb-6">{s.desc}</p>
                <div className="inline-block font-mono text-[9px] tracking-widest uppercase text-brand-teal border border-brand-teal/20 bg-brand-teal/5 px-2.5 py-1">{s.tag}</div>
                <div className="step-bar" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CREDENTIAL SHOWCASE ── */}
      <section className="bg-brand-surface py-40 px-8 lg:px-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div className="reveal-l">
            <div className="flex items-center gap-4 font-mono text-[10px] text-brand-gold tracking-[.15em] uppercase mb-8">
              <span className="w-10 h-px bg-brand-gold" />Your Credential
            </div>
            <h2 className="font-syne font-extrabold leading-[1.05] tracking-tight text-brand-text mb-6" style={{fontSize:'clamp(2rem,4vw,3.6rem)'}}>
              A credential<br />that cannot<br />be faked
            </h2>
            <p className="font-mono text-sm text-brand-muted leading-7 mb-10">
              Every NeuroPass credential contains cryptographic proof tying your skill directly to the evidence you submitted. Verifiable in seconds — no central authority needed.
            </p>
            <ul className="space-y-4">
              {['SHA-256 hash of your proof file stored on-chain','Verifier identity and reputation score included','Public verification via wallet or credential ID','Exportable as Frontier Pass-compatible profile','Permanent — stored on Solana blockchain forever'].map(t => (
                <li key={t} className="flex gap-4 font-mono text-[11px] text-brand-muted">
                  <span className="text-brand-orange mt-px flex-shrink-0">→</span>{t}
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal-r relative pl-5 pb-10">
            <div className="absolute top-5 left-10 right-[-20px] bottom-0 rounded border border-brand-orange/[.06] bg-brand-surface/50" />
            <div className="absolute top-10 left-14 right-[-36px] bottom-[-16px] rounded border border-brand-orange/[.03] bg-brand-dark/60" />
            <div className="cred-3d relative z-10 rounded p-8 lg:p-10 border border-brand-orange/15" style={{background:'linear-gradient(145deg,#1A140E,#0F0C07)',boxShadow:'0 60px 120px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.03), inset 0 1px 0 rgba(255,255,255,.05)'}}>
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t" style={{background:'linear-gradient(90deg,#E8622A,#F2C14E,#07C8B5)'}} />
              <div className="flex items-center gap-3 mb-7">
                <div className="w-6 h-6 rounded-full bg-brand-orange flex items-center justify-center font-syne font-black text-[10px] text-white">N</div>
                <span className="font-mono text-[9px] text-brand-muted tracking-widest">NEUROPASS CREDENTIAL</span>
                <span className="ml-auto font-mono text-[9px] text-brand-teal bg-brand-teal/10 border border-brand-teal/20 rounded-full px-2 py-0.5">DEVNET</span>
              </div>
              <div className="font-syne font-extrabold text-3xl text-brand-text tracking-tight mb-1">Soldering</div>
              <div className="font-mono text-[10px] text-brand-orange tracking-widest uppercase mb-7">Expert Level · Verified</div>
              <div className="h-px bg-brand-border mb-6" />
              <div className="grid grid-cols-2 gap-5 mb-5">
                {[['Holder','Emeka Okonkwo'],['Verifier','mentor_ibrahim.sol'],['Issued','Apr 26, 2025'],['Level','Expert']].map(([l,v]) => (
                  <div key={l}><div className="font-mono text-[8px] text-brand-muted tracking-widest uppercase mb-1">{l}</div><div className="font-mono text-[11px] text-brand-text">{v}</div></div>
                ))}
              </div>
              <div className="font-mono text-[8px] text-brand-muted tracking-widest uppercase mb-2">SHA-256 Proof Hash</div>
              <div className="rounded-sm border border-brand-teal/10 bg-brand-teal/5 p-3 font-mono text-[9px] text-brand-teal break-all leading-5 mb-5">
                80c1e2f1e86be31b91ad8ab05f977089c824bee4110ddc772b2aed469cab75d5
              </div>
              <div className="grid grid-cols-2 gap-5">
                {[['Mint Address','E96QSb...afPd7z'],['Program ID','F11FFZasp...VQD']].map(([l,v]) => (
                  <div key={l}><div className="font-mono text-[8px] text-brand-muted tracking-widest uppercase mb-1">{l}</div><div className="font-mono text-[10px] text-brand-teal">{v}</div></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TECHNOLOGY ── */}
      <section className="relative bg-[#060402] py-40 px-8 lg:px-12 overflow-hidden" id="tech">
        <div className="tech-grid" />
        <div className="relative max-w-5xl mx-auto">
          <div className="reveal text-center mb-20">
            <div className="flex justify-center items-center gap-4 font-mono text-[10px] text-brand-teal tracking-[.15em] uppercase mb-6">
              <span className="w-10 h-px bg-brand-teal" />Technology Stack<span className="w-10 h-px bg-brand-teal" />
            </div>
            <h2 className="font-syne font-extrabold tracking-tight text-brand-text mb-4" style={{fontSize:'clamp(2rem,4vw,3.6rem)'}}>Built on <span className="text-brand-teal">trust</span></h2>
            <p className="font-mono text-base text-brand-muted">Every layer of NeuroPass is designed for integrity, speed, and permanence</p>
          </div>
          <div className="stagger grid grid-cols-2 md:grid-cols-4 gap-0.5 mb-16">
            {TECH.map(t => (
              <div key={t.name} className="tech-block group p-8 lg:p-10 border border-white/[.04] bg-white/[.015] text-center transition-all duration-300 hover:bg-brand-teal/[.04] hover:border-brand-teal/20 cursor-default">
                <div className="w-12 h-12 mx-auto mb-5 rounded-full border border-brand-teal/30 flex items-center justify-center text-xl text-brand-teal group-hover:border-brand-teal/60 transition-colors text-3xl">{t.icon}</div>
                <div className="font-syne font-bold text-sm text-brand-text mb-2">{t.name}</div>
                <div className="font-mono text-[11px] text-brand-muted leading-6">{t.desc}</div>
              </div>
            ))}
          </div>
          <div className="reveal rounded border border-brand-teal/15 overflow-hidden" style={{background:'#030201'}}>
            <div className="flex items-center gap-2 border-b border-brand-teal/10 bg-brand-teal/[.04] px-5 py-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" /><div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" /><div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              <span className="ml-auto font-mono text-[9px] text-brand-muted tracking-widest">credential_record · Solana Devnet</span>
            </div>
            <pre className="p-5 lg:p-7 font-mono text-[10px] lg:text-[11px] leading-7 overflow-x-auto">
{`  `}<span className="t-comment">// On-chain CredentialRecord PDA — publicly verifiable</span>{`
  {
    `}<span className="t-key">"program_id"</span>{`  : `}<span className="t-addr">"F11FFZasp1pEGDaHoguWokQbenh7TLc5SWTz7pbDpVQD"</span>{`,
    `}<span className="t-key">"skill_name"</span>{`  : `}<span className="t-str">"Soldering"</span>{`,
    `}<span className="t-key">"holder"</span>{`     : `}<span className="t-addr">"Hi6bqCvHxc6kcAGZLPiTbSGHDC1dLjmnUvaz1PuAVR89"</span>{`,
    `}<span className="t-key">"verifier"</span>{`   : `}<span className="t-addr">"BwnAeNXAmozFNRBMqV8kk27KU9yrHnPV5UPFQHEk6snM"</span>{`,
    `}<span className="t-key">"proof_hash"</span>{` : `}<span className="t-hash">"80c1e2f1e86be31b91ad8ab05f977089c824bee41..."</span>{`,
    `}<span className="t-key">"mint"</span>{`       : `}<span className="t-addr">"E96QSbEnjRgw8kW1yz7BuRGwikay63EkZ2qoecafPd7z"</span>{`,
    `}<span className="t-key">"minted_at"</span>{`  : `}<span className="t-num">1745698231</span>{`,
    `}<span className="t-key">"network"</span>{`    : `}<span className="t-str">"devnet"</span>{`
  }`}
            </pre>
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ── */}
      <section className="bg-brand-dark py-40 px-8 lg:px-12" id="who">
        <div className="max-w-5xl mx-auto">
          <div className="reveal text-center mb-20">
            <div className="flex justify-center items-center gap-4 font-mono text-[10px] text-brand-orange tracking-[.15em] uppercase mb-6">
              <span className="w-10 h-px bg-brand-orange" />For the People<span className="w-10 h-px bg-brand-orange" />
            </div>
            <h2 className="font-syne font-extrabold tracking-tight text-brand-text" style={{fontSize:'clamp(2rem,4vw,3.6rem)'}}>Built for Africa's real workforce</h2>
          </div>
          <div className="stagger grid grid-cols-1 md:grid-cols-2 gap-0.5">
            {WHO.map(w => (
              <div key={w.title} className="who-card group flex gap-8 items-start bg-brand-surface p-10 lg:p-12 transition-colors duration-300 hover:bg-brand-surface2 cursor-default">
                <div className="text-4xl flex-shrink-0">{w.e}</div>
                <div>
                  <div className="font-syne font-bold text-lg text-brand-text mb-2 tracking-tight">{w.title}</div>
                  <p className="font-mono text-[11px] text-brand-muted leading-6">{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden bg-brand-orange py-40 px-8 lg:px-12" id="cta">
        <div className="cta-stripe" />
        <div className="relative max-w-2xl mx-auto text-center">
          <div className="font-mono text-[10px] text-white/50 tracking-[.2em] uppercase mb-6">Get Started Today</div>
          <h2 className="font-syne font-extrabold text-white leading-[.95] tracking-tight mb-7" style={{fontSize:'clamp(3rem,6vw,5.5rem)'}}>
            Your skills<br />deserve to be seen
          </h2>
          <p className="font-mono text-sm text-white/60 leading-7 mb-14 max-w-lg mx-auto">
            Join NeuroPass. Submit your proof. Get verified. Own your credential on the Solana blockchain.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link to="/auth" className="font-syne font-extrabold text-xs tracking-widest uppercase bg-white text-brand-orange px-10 lg:px-12 py-5 hover:-translate-y-1 transition-transform" style={{boxShadow:'0 12px 40px rgba(0,0,0,.2)'}}>
              Connect Wallet
            </Link>
            <Link to="/verify" className="font-syne font-bold text-xs tracking-widest uppercase border-2 border-white/50 text-white px-10 lg:px-12 py-5 hover:bg-white/10 hover:border-white transition-all">
              Verify Credential
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
