import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { PLAYERS, playerById, type PlayerId } from '../players'
import type { Availability, Status } from '../types'
import { useAllAvailability } from '../lib/allAvailability'
import { useMe } from '../lib/appContext'
import { civNights } from '../lib/civ'
import { CivOverlay } from './CivOverlay'
import { PlayerHead } from './PlayerHead'
import { HoverCard } from './HoverCard'

/** Wie lange Realtime-Änderungen gesammelt werden, bevor ein Toast erscheint (Mehrfachauswahl = viele Events). */
const BATCH_MS = 1000
const TOAST_MS = 5000
const TOAST_OUT_MS = 250
const MAX_TOASTS = 4

const PHRASES: Record<Status | 'deleted', string[]> = {
  yes: [
    'schließt ein Bündnis',
    'schickt eine Handelsroute',
    'stellt Truppen bereit',
    'unterzeichnet einen Freundschaftsvertrag',
  ],
  maybe: [
    'hält sich diplomatisch bedeckt',
    'verlangt Bedenkzeit',
    'prüft die Lage',
    'schickt einen zögerlichen Gesandten',
  ],
  no: [
    'verweigert den Durchmarsch',
    'ruft den Notstand aus',
    'bricht die Verhandlungen ab',
    'zieht sich hinter die Stadtmauern zurück',
  ],
  deleted: ['zieht den Gesandten ab', 'streicht den Eintrag aus den Annalen'],
}

type Change = { player: PlayerId; day: string; status: Status | null; denounce: boolean }

interface Toast {
  id: number
  player: PlayerId | null
  tone: Status | 'deleted' | 'denounce' | 'ruin'
  text: string
  detail: string
  leaving?: boolean
}

interface Wonder {
  day: string
  start: string | null
}

const key = (a: Pick<Availability, 'player' | 'day'>) => `${a.player}|${a.day}`
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]
const dayLabel = (day: string) => format(parseISO(day), 'EEEEEE dd.MM.', { locale: de })

function daysLabel(days: string[]): string {
  const sorted = [...new Set(days)].sort()
  const shown = sorted.slice(0, 2).map(dayLabel).join(', ')
  const rest = sorted.length - 2
  return rest > 0 ? `${shown} +${rest} weitere` : shown
}

/**
 * Beobachtet alle Einträge (Realtime über `AllAvailabilityProvider`) und zeigt
 * „Weltwunder vollendet“, wenn ein Civ-Abend zustande kommt, sowie Diplomatie-Toasts,
 * wenn andere etwas eintragen.
 */
export function CivEvents() {
  const { all, loaded } = useAllAvailability()
  const me = useMe()
  const [toasts, setToasts] = useState<Toast[]>([])
  const [wonders, setWonders] = useState<Wonder[]>([])

  const prevRef = useRef<Map<string, Availability> | null>(null)
  const bufferRef = useRef<{ changes: Change[]; built: Wonder[]; ruined: string[] }>({
    changes: [],
    built: [],
    ruined: [],
  })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idRef = useRef(0)

  const flush = useCallback(() => {
    timerRef.current = null
    const { changes, built, ruined } = bufferRef.current
    bufferRef.current = { changes: [], built: [], ruined: [] }

    const next: Toast[] = []
    const add = (t: Omit<Toast, 'id'>) => next.push({ ...t, id: ++idRef.current })

    // Pro Spieler und Art zusammenfassen
    const groups = new Map<string, Change[]>()
    for (const c of changes) {
      if (c.player === me) continue
      const tone = c.denounce ? 'denounce' : (c.status ?? 'deleted')
      const k = `${c.player}|${tone}`
      groups.set(k, [...(groups.get(k) ?? []), c])
    }
    groups.forEach((list, k) => {
      const [player, tone] = k.split('|') as [PlayerId, Toast['tone']]
      const name = playerById(player).name
      const detail = daysLabel(list.map((c) => c.day))
      if (tone === 'denounce') {
        add({ player, tone, text: `⚔ ${name} hat euch denunziert!`, detail: `Absage an einem fast fertigen Civ-Abend · ${detail}` })
      } else {
        add({ player, tone, text: `${name} ${pick(PHRASES[tone as Status | 'deleted'])}`, detail })
      }
    })

    for (const day of ruined) {
      add({ player: null, tone: 'ruin', text: 'Ein Weltwunder ist eingestürzt', detail: `Der Civ-Abend am ${dayLabel(day)} fällt aus` })
    }

    if (next.length) setToasts((prev) => [...prev, ...next].slice(-MAX_TOASTS))
    if (built.length) setWonders((prev) => [...prev, ...built])
  }, [me])

  useEffect(() => {
    if (!loaded) return
    const cur = new Map(all.map((a) => [key(a), a]))
    const prev = prevRef.current
    prevRef.current = cur
    if (!prev) return // erster Stand = Ausgangslage, nichts melden

    const buf = bufferRef.current
    cur.forEach((a, k) => {
      const old = prev.get(k)
      if (old && old.status === a.status) return
      const othersYes = all.filter((b) => b.day === a.day && b.player !== a.player && b.status === 'yes').length
      buf.changes.push({
        player: a.player,
        day: a.day,
        status: a.status,
        denounce: a.status === 'no' && othersYes === PLAYERS.length - 1,
      })
    })
    prev.forEach((a, k) => {
      if (!cur.has(k)) buf.changes.push({ player: a.player, day: a.day, status: null, denounce: false })
    })

    const today = format(new Date(), 'yyyy-MM-dd')
    const before = civNights(prev.values())
    const after = civNights(cur.values())
    after.forEach((n, day) => {
      if (day >= today && !before.has(day)) buf.built.push({ day, start: n.start })
    })
    before.forEach((_, day) => {
      if (day >= today && !after.has(day)) buf.ruined.push(day)
    })

    if (!buf.changes.length && !buf.built.length && !buf.ruined.length) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flush, BATCH_MS)
  }, [all, loaded, flush])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), TOAST_OUT_MS)
  }, [])

  const closeWonder = useCallback(() => setWonders((prev) => prev.slice(1)), [])
  const wonder = wonders[0]

  return (
    <>
      {createPortal(
        <div className="toast-stack" aria-live="polite">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>,
        document.body,
      )}
      {wonder && (
        <CivOverlay
          key={wonder.day}
          variant="wonder"
          kicker="Weltwunder vollendet"
          title="Civ-Abend!"
          subtitle={
            <>
              {format(parseISO(wonder.day), 'EEEE, d. MMMM', { locale: de })}
              {wonder.start && <> · ab {wonder.start} Uhr</>}
            </>
          }
          onClose={closeWonder}
        >
          <div className="civ-overlay-heads">
            {PLAYERS.map((p, i) => (
              <span key={p.id} className="ring ring-yes" style={{ animationDelay: `${400 + i * 150}ms` }}>
                <PlayerHead player={p} size={72} />
              </span>
            ))}
          </div>
        </CivOverlay>
      )}
    </>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), TOAST_MS)
    return () => clearTimeout(t)
  }, [toast.id, onDismiss])

  return (
    <button
      className={`toast toast-${toast.tone} ${toast.leaving ? 'toast-leaving' : ''}`}
      onClick={() => onDismiss(toast.id)}
    >
      {toast.player ? (
        <HoverCard player={playerById(toast.player)}>
          <PlayerHead player={playerById(toast.player)} size={36} />
        </HoverCard>
      ) : (
        <span className="toast-icon" aria-hidden>
          🏚
        </span>
      )}
      <span className="toast-text">
        <strong>{toast.text}</strong>
        <small>{toast.detail}</small>
      </span>
    </button>
  )
}
