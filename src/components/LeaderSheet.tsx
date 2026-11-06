import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Player } from '../players'
import type { Availability } from '../types'
import { useAllAvailability } from '../lib/allAvailability'
import { useMe } from '../lib/appContext'
import { EntryFooter, LeaderFront, statsFor } from './Leader'

const DISMISS_AT = 110 // px nach unten ziehen …
const DISMISS_SPEED = 0.5 // … oder mit Schwung (px/ms)

interface Props {
  player: Player
  entry?: Availability | null
  pickDay?: (day: string) => void
  onClose: () => void
}

/** Anführer-Karte als Panel von unten. Schließen: daneben tippen, nach unten wischen, × oder Esc. */
export function LeaderSheet({ player, entry, pickDay, onClose }: Props) {
  const { all } = useAllAvailability()
  const me = useMe()
  const stats = useMemo(() => statsFor(player, all), [player, all])
  const [closing, setClosing] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setClosing(true)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Nach unten wischen schließt – nur wenn nichts darin gerade gescrollt ist
  useEffect(() => {
    const el = sheetRef.current
    if (!el) return
    let start: { y: number; t: number } | null = null
    let dy = 0

    const onStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      if (e.touches.length !== 1 || target.closest('input, textarea') || el.scrollTop > 0) return
      const inner = target.closest<HTMLElement>('.leader-progress ul, .leader-known')
      if (inner && inner.scrollTop > 0) return
      start = { y: e.touches[0].clientY, t: performance.now() }
      dy = 0
    }
    const onMove = (e: TouchEvent) => {
      if (!start) return
      dy = e.touches[0].clientY - start.y
      if (dy <= 0) {
        el.style.transform = ''
        if (dy < -6) start = null // nach oben → normales Scrollen
        return
      }
      e.preventDefault()
      el.style.transition = 'none'
      el.style.transform = `translateY(${dy}px)`
    }
    const onEnd = () => {
      if (!start) return
      const speed = dy / Math.max(1, performance.now() - start.t)
      start = null
      el.style.transition = ''
      if (dy > DISMISS_AT || (speed > DISMISS_SPEED && dy > 30)) setClosing(true)
      else el.style.transform = ''
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  return createPortal(
    <>
      <div
        className={`leader-sheet-backdrop ${closing ? 'fade-out' : 'fade-in'}`}
        onClick={() => setClosing(true)}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${player.name} ${player.title}`}
        className={`leader-sheet ${closing ? 'leader-sheet-out' : 'leader-sheet-in'}`}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={(e) => e.animationName === 'leader-sheet-out' && onClose()}
      >
        <div className="leader-sheet-grab" aria-hidden="true">
          <span />
        </div>
        <button className="close-btn leader-sheet-close" onClick={() => setClosing(true)} aria-label="Schließen">
          ×
        </button>
        <div className="leader-face leader-front leader-face-static">
          <LeaderFront
            player={player}
            stats={stats}
            me={me ?? undefined}
            medallionSize={110}
            onPickDay={
              pickDay
                ? (day) => {
                    onClose()
                    pickDay(day)
                  }
                : undefined
            }
            footer={<EntryFooter stats={stats} entry={entry} />}
          />
        </div>
      </div>
    </>,
    document.body,
  )
}
