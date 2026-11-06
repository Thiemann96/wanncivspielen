import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { PLAYERS, playerById, type PlayerId } from '../players'
import { STATUS_LABEL, shortTime, type Availability, type Status } from '../types'
import { HoverCard } from './HoverCard'
import { PlayerHead } from './PlayerHead'

interface Props {
  days: string[] // yyyy-MM-dd, sortiert
  anchor: DOMRect
  me: PlayerId
  forDay: (day: string) => Availability[]
  onSave: (list: Availability[]) => Promise<void>
  onDelete: (player: PlayerId, days: string[]) => Promise<void>
  onClose: () => void
}

interface Form {
  status: Status
  time: string
  note: string
}

/** Vorbelegung: die eigenen Einträge, wenn sie an allen gewählten Tagen gleich sind. */
function prefill(mine: (Availability | undefined)[]): Form {
  const first = mine[0]
  const same =
    first &&
    mine.every(
      (m) =>
        m &&
        m.status === first.status &&
        m.from_time === first.from_time &&
        (m.note ?? '') === (first.note ?? ''),
    )
  return same
    ? { status: first.status, time: shortTime(first.from_time) ?? '19:00', note: first.note ?? '' }
    : { status: 'yes', time: '19:00', note: '' }
}

const toDate = (day: string) => parseISO(day)
const longDate = (day: string) => format(toDate(day), 'EEEE, d. MMMM', { locale: de })
const shortDate = (day: string) => format(toDate(day), 'EEEEEE d.M.', { locale: de })

const WIDTH = 300
const GAP = 10
const MARGIN = 8
const MOBILE = 600

type Placement =
  | { kind: 'side'; side: 'right' | 'left'; top: number; left: number; arrowTop: number }
  | { kind: 'sheet' }

function place(anchor: DOMRect, height: number): Placement {
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (vw < MOBILE) return { kind: 'sheet' }

  let side: 'right' | 'left' = 'right'
  let left = anchor.right + GAP
  if (left + WIDTH > vw - MARGIN) {
    side = 'left'
    left = Math.max(MARGIN, anchor.left - GAP - WIDTH)
  }
  // Vertikal am Tag ausrichten, aber im sichtbaren Bereich halten
  const viewTop = Math.min(Math.max(MARGIN, anchor.top), Math.max(MARGIN, vh - height - MARGIN))
  const anchorMid = anchor.top + anchor.height / 2
  const arrowTop = Math.min(Math.max(16, anchorMid - viewTop), height - 16)
  return { kind: 'side', side, left: left + window.scrollX, top: viewTop + window.scrollY, arrowTop }
}

export function DayEditor({ days, anchor, me, forDay, onSave, onDelete, onClose }: Props) {
  const single = days.length === 1
  const mineByDay = days.map((d) => forDay(d).find((a) => a.player === me))
  const daysWithMine = days.filter((_, i) => mineByDay[i])

  const [form, setForm] = useState<Form>(() => prefill(mineByDay))
  const [dirty, setDirty] = useState(false)
  const { status, time, note } = form
  const edit = (patch: Partial<Form>) => {
    setForm((f) => ({ ...f, ...patch }))
    setDirty(true)
  }

  // Auswahl geändert, solange noch nichts angefasst wurde: neu vorbelegen
  const selKey = days.join(',')
  const [seenKey, setSeenKey] = useState(selKey)
  if (seenKey !== selKey) {
    setSeenKey(selKey)
    if (!dirty) setForm(prefill(mineByDay))
  }

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const [glide, setGlide] = useState(false)
  const [closing, setClosing] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const placedOnce = useRef(false)

  // Erst messen, dann positionieren, dann einblenden; spätere Wechsel gleiten
  useLayoutEffect(() => {
    if (!ref.current) return
    if (placedOnce.current) setGlide(true)
    placedOnce.current = true
    setPlacement(place(anchor, ref.current.offsetHeight))
  }, [anchor, selKey])

  const close = () => setClosing(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setClosing(true)
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element
      // Klick auf einen anderen Tag (oder einen Vorschlag) wechselt nur den Tag, schließt nicht
      if (ref.current?.contains(t) || t.closest('.day, .suggestion, .hovercard, .leader-sheet, .leader-sheet-backdrop')) return
      setClosing(true)
    }
    const onResize = () => setClosing(true)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      close()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  function save(e?: FormEvent) {
    e?.preventDefault()
    run(() =>
      onSave(
        days.map((day) => ({
          player: me,
          day,
          status,
          from_time: status === 'no' ? null : time || null,
          note: note.trim() || null,
        })),
      ),
    )
  }

  const others = PLAYERS.filter((p) => p.id !== me).map((p) => {
    const entries = days.map((d) => forDay(d).find((a) => a.player === p.id))
    return { player: p, entry: entries[0], yes: entries.filter((a) => a?.status === 'yes').length }
  })
  const title = single ? longDate(days[0]) : `${days.length} Tage ausgewählt`

  const isSheet = placement?.kind === 'sheet'
  const classes = [
    'popover',
    placement ? (isSheet ? 'popover-sheet' : `popover-${placement.side}`) : 'popover-measuring',
    placement && !closing && 'popover-in',
    glide && 'popover-glide',
    closing && 'popover-out',
  ]
    .filter(Boolean)
    .join(' ')

  const style =
    placement?.kind === 'side'
      ? ({ top: placement.top, left: placement.left, width: WIDTH, '--arrow-top': `${placement.arrowTop}px` } as CSSProperties)
      : placement
        ? undefined
        : { width: WIDTH, top: 0, left: 0 }

  return createPortal(
    <>
      {isSheet && <div className={`sheet-backdrop ${closing ? 'fade-out' : 'fade-in'}`} />}
      <div
        ref={ref}
        className={classes}
        style={style}
        role="dialog"
        aria-label={title}
        onAnimationEnd={(e) => e.animationName.startsWith('popover-out') && onClose()}
      >
        <form onSubmit={save}>
          <div className="popover-header">
            <h2 key={single ? 'single' : 'multi'} className="swap-in">
              {title}
            </h2>
            <button type="button" className="icon-btn" onClick={close} aria-label="Schließen">
              ×
            </button>
          </div>

          {!single && (
            <div className="day-chips">
              {days.map((d) => (
                <span key={d} className="chip">
                  {shortDate(d)}
                </span>
              ))}
            </div>
          )}

          <div className="me-row">
            <HoverCard player={playerById(me)}>
              <span className={`ring ring-${status}`}>
                <PlayerHead player={playerById(me)} size={48} />
              </span>
            </HoverCard>
            <div className="segmented" data-active={status}>
              <span className="segmented-thumb" />
              {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                <button
                  type="button"
                  key={s}
                  className={status === s ? 'active' : ''}
                  onClick={() => edit({ status: s })}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          <div className={`collapse ${status === 'no' ? 'collapsed' : ''}`}>
            <div>
              <label className="field">
                <span>ab</span>
                <input type="time" value={time} onChange={(e) => edit({ time: e.target.value })} />
              </label>
            </div>
          </div>
          <label className="field">
            <span>Notiz</span>
            <input
              type="text"
              value={note}
              placeholder="optional"
              onChange={(e) => edit({ note: e.target.value })}
            />
          </label>

          <ul className="others">
            {others.map(({ player, entry, yes }) => (
              <li
                key={player.id}
                className={
                  single
                    ? entry
                      ? `entry-${entry.status}-text`
                      : ''
                    : yes === days.length
                      ? 'entry-yes-text'
                      : yes
                        ? 'entry-maybe-text'
                        : ''
                }
              >
                <HoverCard player={player} entry={single ? (entry ?? null) : undefined}>
                  <span
                    className={`ring ${
                      single
                        ? entry
                          ? `ring-${entry.status}`
                          : ''
                        : yes === days.length
                          ? 'ring-yes'
                          : yes
                            ? 'ring-maybe'
                            : ''
                    }`}
                  >
                    <PlayerHead player={player} size={28} />
                  </span>
                </HoverCard>
                <b>{player.name}</b>
                <span>
                  {single
                    ? entry
                      ? `${STATUS_LABEL[entry.status]}${entry.from_time && entry.status !== 'no' ? ` ab ${shortTime(entry.from_time)}` : ''}${entry.note ? ` – ${entry.note}` : ''}`
                      : 'noch nichts'
                    : `kann an ${yes} von ${days.length}`}
                </span>
              </li>
            ))}
          </ul>

          {single && <p className="hint hint-keys">Tipp: ⌘/Strg-Klick oder ⇧-Klick wählt mehrere Tage</p>}

          {error && <p className="error shake">{error}</p>}

          <div className="popover-actions">
            {daysWithMine.length > 0 && (
              <button
                type="button"
                className="danger"
                disabled={busy}
                onClick={() => run(() => onDelete(me, daysWithMine))}
              >
                Löschen{single ? '' : ` (${daysWithMine.length})`}
              </button>
            )}
            <span className="spacer" />
            <button type="submit" className="primary" disabled={busy}>
              {busy ? <span className="spinner" /> : single ? 'Speichern' : `Für ${days.length} Tage speichern`}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body,
  )
}
