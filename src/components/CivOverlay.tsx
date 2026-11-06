import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  variant: 'wonder' | 'era'
  kicker: string
  title: string
  subtitle?: ReactNode
  children?: ReactNode
  /** Schließt sich nach dieser Zeit von selbst (ms). */
  duration?: number
  onClose: () => void
}

const OUT_MS = 300

/** Vollbild-Einblendung im Stil „Weltwunder vollendet“ bzw. „Neues Zeitalter“. */
export function CivOverlay({ variant, kicker, title, subtitle, children, duration = 7000, onClose }: Props) {
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (!closing) return
    const t = setTimeout(onClose, OUT_MS)
    return () => clearTimeout(t)
  }, [closing, onClose])

  useEffect(() => {
    const t = setTimeout(() => setClosing(true), duration)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') setClosing(true)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [duration])

  // Portal an <body>: .app hat eine transform-Animation und wäre sonst Bezugsrahmen für position: fixed
  return createPortal(
    <div
      className={`civ-overlay civ-overlay-${variant} ${closing ? 'civ-overlay-closing' : ''}`}
      role="dialog"
      aria-live="assertive"
      onClick={() => setClosing(true)}
    >
      <div className="civ-overlay-rays" aria-hidden />
      <div className="civ-overlay-card">
        <p className="civ-overlay-kicker">{kicker}</p>
        <h2 className="game-title civ-overlay-title">{title}</h2>
        {subtitle && <p className="civ-overlay-subtitle">{subtitle}</p>}
        {children}
        <p className="civ-overlay-hint">Klicken zum Fortfahren</p>
      </div>
    </div>,
    document.body,
  )
}
