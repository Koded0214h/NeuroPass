import { useEffect, useRef } from 'react'

export default function Cursor() {
  const dot = useRef(null), ring = useRef(null)
  const rx = useRef(0), ry = useRef(0)
  useEffect(() => {
    let raf, mx = 0, my = 0
    const onMove = e => {
      mx = e.clientX; my = e.clientY
      if (dot.current) { dot.current.style.left = mx + 'px'; dot.current.style.top = my + 'px' }
    }
    const tick = () => {
      rx.current += (mx - rx.current) * .11; ry.current += (my - ry.current) * .11
      if (ring.current) { ring.current.style.left = rx.current + 'px'; ring.current.style.top = ry.current + 'px' }
      raf = requestAnimationFrame(tick)
    }
    const big = () => { dot.current?.classList.add('big'); ring.current?.classList.add('big') }
    const sm  = () => { dot.current?.classList.remove('big'); ring.current?.classList.remove('big') }
    const onOver = e => { if (e.target.closest('a,button,.step-card,.who-card,.tech-block,.cred-3d,.skill-card,.verify-card')) big() }
    const onOut  = e => { if (e.target.closest('a,button,.step-card,.who-card,.tech-block,.cred-3d,.skill-card,.verify-card')) sm() }
    tick()
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseover', onOver)
    window.addEventListener('mouseout', onOut)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseover', onOver); window.removeEventListener('mouseout', onOut) }
  }, [])
  return (<><div className="cursor-dot" ref={dot} /><div className="cursor-ring" ref={ring} /></>)
}
