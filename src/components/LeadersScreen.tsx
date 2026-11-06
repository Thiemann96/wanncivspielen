import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { PLAYERS, type Player, type PlayerId } from '../players'
import { useAllAvailability } from '../lib/allAvailability'
import { LeaderFront, statsFor, type Stats } from './Leader'
import { PlayerHead } from './PlayerHead'
import { WEEKDAY_LONG, WeekdayChart } from './WeekdayChart'

const PHONE = '(max-width: 640px)'
function subscribePhone(cb: () => void) {
  const mq = window.matchMedia(PHONE)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const usePhone = () => useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE).matches)

function shuffle<T>(list: readonly T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Props {
  me: PlayerId
  onClose: () => void
}

export function LeadersScreen({ me, onClose }: Props) {
  const { all, error } = useAllAvailability()
  const [closing, setClosing] = useState(false)
  const [flipped, setFlipped] = useState<Set<string>>(new Set())
  const phone = usePhone()
  // Auf dem Handy bei jedem Öffnen neu gemischt
  const [deckOrder] = useState(() => shuffle(PLAYERS))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setClosing(true)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const stats = useMemo(() => new Map(PLAYERS.map((p) => [p.id, statsFor(p, all)])), [all])

  const toggle = (id: string) =>
    setFlipped((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return createPortal(
    <div
      className={`leaders-backdrop ${closing ? 'leaders-closing' : ''}`}
      onClick={() => setClosing(true)}
      onAnimationEnd={(e) => e.animationName === 'leaders-out' && onClose()}
    >
      <section
        className="panel leaders"
        role="dialog"
        aria-label="Anführer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header leaders-header">
          <h2>Anführer</h2>
          <button className="close-btn" onClick={() => setClosing(true)} aria-label="Schließen">
            ×
          </button>
        </div>
        <p className="leaders-hint">
          {phone ? 'Wischen zum Blättern, Tippen für die Statistik' : 'Klick auf eine Karte für die Statistik'}
        </p>
        {error && <p className="error">{error}</p>}

        {phone ? (
          <LeaderDeck
            players={deckOrder}
            render={(p) => (
              <LeaderCard
                me={me}
                player={p}
                stats={stats.get(p.id)!}
                flipped={flipped.has(p.id)}
                onToggle={() => toggle(p.id)}
                delay={0}
              />
            )}
          />
        ) : (
          <div className="leaders-grid">
            {PLAYERS.map((p, i) => (
              <LeaderCard
                me={me}
                key={p.id}
                player={p}
                stats={stats.get(p.id)!}
                flipped={flipped.has(p.id)}
                onToggle={() => toggle(p.id)}
                delay={i * 70}
              />
            ))}
          </div>
        )}
      </section>
    </div>,
    document.body,
  )
}

const THROW_MS = 300
const DRAG_START = 8 // px, ab dann ist es ein Wischen statt eines Tippens
const THROW_AT = 100 // px Weg …
const THROW_SPEED = 0.6 // … oder px/ms Schwung

/**
 * Kartenstapel wie bei Dating-Apps: Karte zur Seite ziehen und loslassen.
 * Links = nächster Anführer, rechts = vorheriger. Darunter liegt jeweils die Karte, die als Nächstes kommt.
 */
function LeaderDeck({ players, render }: { players: Player[]; render: (p: Player) => ReactNode }) {
  const n = players.length
  const [index, setIndex] = useState(0)
  const [peek, setPeek] = useState<1 | -1>(1) // welche Karte unten liegt: nächste (1) oder vorige (-1)
  const [throwing, setThrowing] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number; x: number; y: number; dx: number; t: number; active: boolean } | null>(
    null,
  )
  const dragged = useRef(false)

  const at = (i: number) => players[(i + n) % n]
  const top = at(index)
  const behind = at(index + peek)

  function move(dx: number) {
    const el = topRef.current
    if (!el) return
    el.style.transform = dx ? `translateX(${dx}px) rotate(${dx / 18}deg)` : ''
    el.style.setProperty('--dx', String(dx))
  }

  function throwCard(dir: 1 | -1) {
    setPeek(dir)
    setThrowing(true)
    const el = topRef.current
    if (el) {
      el.style.transform = `translateX(${-dir * 150}vw) rotate(${-dir * 30}deg)`
      el.style.setProperty('--dx', String(-dir * 200))
    }
    window.setTimeout(() => {
      setIndex((i) => (i + dir + n) % n)
      setThrowing(false)
    }, THROW_MS)
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (throwing || (e.target as HTMLElement).closest('input, textarea')) return
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, t: performance.now(), active: false }
    dragged.current = false
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.active) {
      if (Math.abs(dx) < DRAG_START && Math.abs(dy) < DRAG_START) return
      // Eher senkrecht → der Nutzer scrollt in der Karte, nicht wischen
      if (Math.abs(dy) > Math.abs(dx)) {
        drag.current = null
        return
      }
      d.active = true
      dragged.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      e.currentTarget.classList.add('dragging')
    }
    d.dx = dx
    move(dx)
    const dir = dx < 0 ? 1 : -1
    if (dir !== peek) setPeek(dir)
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current
    drag.current = null
    if (!d?.active) return
    e.currentTarget.classList.remove('dragging')
    const speed = Math.abs(d.dx) / Math.max(1, performance.now() - d.t)
    if (Math.abs(d.dx) > THROW_AT || (speed > THROW_SPEED && Math.abs(d.dx) > 30)) throwCard(d.dx < 0 ? 1 : -1)
    else move(0)
  }

  // Beide Karten nach Spieler-ID geschlüsselt: Die untere Karte wird zur oberen, ohne neu zu mounten.
  const cards = n > 1 ? [behind, top] : [top]
  return (
    <>
      <div className="leaders-deck">
        {cards.map((p) => {
          const isTop = p.id === top.id
          return (
            <div
              key={p.id}
              ref={isTop ? topRef : undefined}
              className={`deck-card ${isTop ? 'deck-top' : 'deck-behind'}`}
              aria-hidden={!isTop}
              onPointerDown={isTop ? onPointerDown : undefined}
              onPointerMove={isTop ? onPointerMove : undefined}
              onPointerUp={isTop ? onPointerUp : undefined}
              onPointerCancel={isTop ? onPointerUp : undefined}
              onClickCapture={(e) => {
                // Nach dem Wischen kein Umdrehen auslösen
                if (dragged.current) {
                  e.stopPropagation()
                  e.preventDefault()
                  dragged.current = false
                }
              }}
            >
              {isTop && (
                <>
                  <span className="deck-stamp deck-stamp-ally">Bündnis</span>
                  <span className="deck-stamp deck-stamp-denounce">Anprangern</span>
                </>
              )}
              {render(p)}
            </div>
          )
        })}
      </div>
      <div className="deck-dots">
        {players.map((p, i) => (
          <button
            key={p.id}
            className={`deck-dot ${i === index ? 'active' : ''}`}
            onClick={() => !throwing && setIndex(i)}
            aria-label={p.name}
            aria-current={i === index}
          >
            <PlayerHead player={p} size={30} />
          </button>
        ))}
      </div>
    </>
  )
}

interface CardProps {
  me: PlayerId
  player: Player
  stats: Stats
  flipped: boolean
  onToggle: () => void
  delay: number
}

function LeaderCard({ me, player, stats, flipped, onToggle, delay }: CardProps) {
  const total = stats.yes + stats.maybe + stats.no

  return (
    <div className={`leader-card ${flipped ? 'flipped' : ''}`} style={{ animationDelay: `${delay}ms` }}>
      <div
        role="button"
        tabIndex={0}
        className="leader-inner"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        aria-pressed={flipped}
        aria-label={`${player.name}: ${flipped ? 'Übersicht zeigen' : 'Statistik zeigen'}`}
      >
        {/* ---------- Vorderseite ---------- */}
        <div className="leader-face leader-front" aria-hidden={flipped}>
          <LeaderFront
            player={player}
            stats={stats}
            me={me}
            footer={
              <>
                <span className="pill-gold">{stats.yes} × Kann</span>
                <span className="pill-blue">Statistik ▸</span>
              </>
            }
          />
        </div>

        {/* ---------- Rückseite ---------- */}
        <div className="leader-face leader-back" aria-hidden={!flipped}>
          <div className="leader-titles">
            <span className="leader-role">Statistik</span>
            <span className="leader-name">{player.name}</span>
          </div>

          <div className="leader-fav">
            <span className="leader-fav-label">Lieblingstag</span>
            <span className="leader-fav-day">
              {stats.favorite === null ? '–' : WEEKDAY_LONG[stats.favorite]}
            </span>
            {stats.favorite !== null && (
              <span className="leader-fav-sub">
                {stats.counts[stats.favorite].yes} × Kann, {stats.counts[stats.favorite].maybe} ×
                Vielleicht
              </span>
            )}
          </div>

          {total > 0 ? (
            <WeekdayChart counts={stats.counts} favorite={stats.favorite} />
          ) : (
            <p className="leader-empty">Noch keine Daten für eine Statistik.</p>
          )}

          <dl className="leader-totals">
            <div>
              <dt>Kann</dt>
              <dd>{stats.yes}</dd>
            </div>
            <div>
              <dt>Vielleicht</dt>
              <dd>{stats.maybe}</dd>
            </div>
            <div>
              <dt>Kann nicht</dt>
              <dd>{stats.no}</dd>
            </div>
          </dl>

          <div className="leader-footer">
            <span className="pill-blue">◂ Zurück</span>
          </div>
        </div>
      </div>
    </div>
  )
}
