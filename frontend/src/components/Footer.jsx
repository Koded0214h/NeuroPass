import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-[#060402] border-t border-brand-border px-8 lg:px-12 py-12">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <Link to="/" className="font-syne font-extrabold text-lg text-brand-text">NEURO<span className="text-brand-orange">PASS</span></Link>
        <ul className="flex gap-6 lg:gap-8 flex-wrap justify-center">
          {[['Dashboard','/dashboard'],['Submit','/submit'],['Verify','/verify'],['Profile','/profile'],['Verifier','/verifier']].map(([l, h]) => (
            <li key={l}><Link to={h} className="font-mono text-[11px] text-brand-muted tracking-wider hover:text-brand-text transition-colors">{l}</Link></li>
          ))}
        </ul>
        <div className="font-mono text-[10px] text-brand-muted text-right space-y-1">
          <div>Built on <span className="text-brand-teal">Solana Devnet</span></div>
          <div>OnchainED 1.0 · 2025</div>
        </div>
      </div>
    </footer>
  )
}
