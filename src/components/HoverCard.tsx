import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import type { Player } from '../players'
import { useAllAvailability } from '../lib/allAvailability'
import { useMe, usePickDay } from '../lib/appContext'
import type { Availability } from '../types'
import { useLeaderSheet } from '../lib/leaderSheet'
import { EntryFooter, LeaderFront, statsFor } from './Leader'

const SHOW_DELAY = 250
const LOCK_AFTER = 800 // so lange offen → Tooltip rastet ein und wird bedienbar
const LEAVE_GRACE = 300 // Zeit, um vom Kopf in den eingerasteten Tooltip zu wechseln
const GAP = 10
const MARGIN = 8

interface Props {
  player: Player
  /** Eintrag für den Kontext (Tag), falls vorhanden. `null` = bewusst „noch nichts“. */
  entry?: Availability | null
  children: ReactNode
}

/**
 * Zeigt beim Hovern mit der Maus die Anführer-Karte als Tooltip.
 * Nach LOCK_AFTER ms rastet sie ein: dann kann man hineinfahren, scrollen und klicken.
 * Auf Touch-Geräten öffnet Antippen stattdessen die Detailansicht (LeaderSheet).
 */
export function HoverCard({ player, entry, children }: Props) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const [locked, setLocked] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const showTimer = useRef<number | undefined>(undefined)
  const hideTimer = useRef<number | undefined>(undefined)
  const lastPointer = useRef('mouse')
  const openSheet = useLeaderSheet()
  const pickDay = usePickDay()

  function close() {
    window.clearTimeout(showTimer.current)
    window.clearTimeout(hideTimer.current)
    setAnchor(null)
    setLocked(false)
  }

  // Der Tooltip ist per Portal gerendert, gehört im React-Baum aber zu diesem <span>.
  // Der Wechsel Kopf ↔ Tooltip löst daher kein „Verlassen“ aus; nur der Spalt dazwischen.
  function onEnter(e: ReactPointerEvent) {
    if (e.pointerType !== 'mouse') return
    window.clearTimeout(hideTimer.current)
    if (anchor) return
    window.clearTimeout(showTimer.current)
    showTimer.current = window.setTimeout(() => {
      if (ref.current) setAnchor(ref.current.getBoundingClientRect())
    }, SHOW_DELAY)
  }

  function onLeave() {
    window.clearTimeout(showTimer.current)
    if (locked) hideTimer.current = window.setTimeout(close, LEAVE_GRACE)
    else close()
  }

  function onDown(e: ReactPointerEvent) {
    lastPointer.current = e.pointerType
    // Klicks im Tooltip gehören dem Tooltip; Klick auf den Kopf schließt ihn
    if (cardRef.current?.contains(e.target as Node)) return
    close()
  }

  useEffect(
    () => () => {
      window.clearTimeout(showTimer.current)
      window.clearTimeout(hideTimer.current)
    },
    [],
  )

  // Einrasten nach LOCK_AFTER ms
  useEffect(() => {
    if (!anchor || locked) return
    const t = window.setTimeout(() => setLocked(true), LOCK_AFTER)
    return () => window.clearTimeout(t)
  }, [anchor, locked])

  // Scrollen der Seite schließt (sonst rutscht die Karte weg) – Scrollen im Tooltip nicht
  useEffect(() => {
    if (!anchor) return
    const onScroll = (e: Event) => {
      if (cardRef.current?.contains(e.target as Node)) return
      close()
    }
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [anchor])

  // Eingerastet: Esc oder Klick daneben schließt
  useEffect(() => {
    if (!locked) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const onDocDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (cardRef.current?.contains(t) || ref.current?.contains(t)) return
      close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDocDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDocDown)
    }
  }, [locked])

  return (
    <span
      ref={ref}
      className="hovercard-anchor"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onPointerDown={onDown}
      onClick={(e) => {
        // Touch/Stift: Antippen öffnet die Detailansicht (statt den Tag o. Ä. darunter)
        if (lastPointer.current === 'mouse' || !openSheet) return
        if (cardRef.current?.contains(e.target as Node)) return
        e.stopPropagation()
        e.preventDefault()
        close()
        openSheet({ player, entry, pickDay })
      }}
    >
      {children}
      {anchor && (
        <Card
          cardRef={cardRef}
          player={player}
          entry={entry}
          anchor={anchor}
          locked={locked}
          onDone={close}
        />
      )}
    </span>
  )
}

interface CardProps {
  cardRef: RefObject<HTMLDivElement | null>
  player: Player
  entry?: Availability | null
  anchor: DOMRect
  locked: boolean
  onDone: () => void
}

function Card({ cardRef, player, entry, anchor, locked, onDone }: CardProps) {
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null)
  const { all } = useAllAvailability()
  const me = useMe()
  const pickDay = usePickDay()
  const stats = useMemo(() => statsFor(player, all), [player, all])

  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el) return
    const { offsetWidth: w, offsetHeight: h } = el
    const vh = window.innerHeight
    // Bevorzugt über dem Kopf, sonst darunter; passt beides nicht, im Fenster einpassen
    let below = false
    let top = anchor.top - h - GAP
    if (top < MARGIN) {
      below = true
      top = anchor.bottom + GAP
      if (top + h > vh - MARGIN) top = Math.max(MARGIN, vh - h - MARGIN)
    }
    const centered = anchor.left + anchor.width / 2 - w / 2
    const left = Math.min(Math.max(MARGIN, centered), window.innerWidth - w - MARGIN)
    setPos({ top, left, below })
  }, [anchor, cardRef])

  const classes = [
    'hovercard',
    pos ? (pos.below ? 'hovercard-below' : 'hovercard-above') : 'hovercard-measuring',
    locked && 'hovercard-locked',
  ]
    .filter(Boolean)
    .join(' ')

  return createPortal(
    <div
      ref={cardRef}
      role={locked ? 'dialog' : 'tooltip'}
      aria-label={`Anführer ${player.name}`}
      className={classes}
      style={pos ? { top: pos.top, left: pos.left } : undefined}
      // Klicks im Tooltip sollen nicht beim Tag (o. Ä.) darunter im React-Baum ankommen
      onClick={(e) => e.stopPropagation()}
    >
      <div className="leader-face leader-front leader-face-static">
        <span className="lock-bar" aria-hidden="true" />
        {locked && <span className="lock-badge">Fixiert</span>}
        <LeaderFront
          player={player}
          stats={stats}
          me={locked ? (me ?? undefined) : undefined}
          medallionSize={110}
          visibleRows={4}
          onPickDay={
            locked && pickDay
              ? (day) => {
                  onDone()
                  pickDay(day)
                }
              : undefined
          }
          footer={<EntryFooter stats={stats} entry={entry} />}
        />
      </div>
    </div>,
    document.body,
  )
}
