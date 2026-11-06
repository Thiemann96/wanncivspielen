import { useState, type FormEvent, type ReactNode } from 'react'
import { format, getDay, parseISO, startOfDay } from 'date-fns'
import { de } from 'date-fns/locale'
import type { Player, PlayerId } from '../players'
import { useFacts } from '../lib/facts'
import { useCycle } from '../hooks/useCycle'
import { STATUS_LABEL, shortTime, type Availability } from '../types'
import { PlayerHead } from './PlayerHead'
import type { WeekdayCount } from './WeekdayChart'

/** Montag = 0 … Sonntag = 6 */
const weekdayIndex = (day: string) => (getDay(parseISO(day)) + 6) % 7

export interface Stats {
  upcoming: Availability[]
  counts: WeekdayCount[]
  favorite: number | null
  yes: number
  maybe: number
  no: number
}

export function statsFor(player: Player, all: Availability[]): Stats {
  const today = format(startOfDay(new Date()), 'yyyy-MM-dd')
  const mine = all.filter((a) => a.player === player.id)
  const counts: WeekdayCount[] = Array.from({ length: 7 }, () => ({ yes: 0, maybe: 0 }))
  for (const a of mine) {
    const i = weekdayIndex(a.day)
    if (a.status === 'yes') counts[i].yes++
    if (a.status === 'maybe') counts[i].maybe++
  }
  // Lieblingstag: „Kann“ zählt voll, „Vielleicht“ halb
  let favorite: number | null = null
  let best = 0
  counts.forEach((c, i) => {
    const score = c.yes + c.maybe / 2
    if (score > best) {
      best = score
      favorite = i
    }
  })
  return {
    upcoming: mine
      .filter((a) => a.day >= today && a.status !== 'no')
      .sort((a, b) => a.day.localeCompare(b.day)),
    counts,
    favorite,
    yes: mine.filter((a) => a.status === 'yes').length,
    maybe: mine.filter((a) => a.status === 'maybe').length,
    no: mine.filter((a) => a.status === 'no').length,
  }
}

/** Zusagequote in Prozent („Vielleicht“ zählt halb) oder null ohne Einträge. */
export function quoteOf(stats: Stats) {
  const total = stats.yes + stats.maybe + stats.no
  return total ? Math.round(((stats.yes + stats.maybe / 2) / total) * 100) : null
}

interface FrontProps {
  player: Player
  stats: Stats
  /** Ohne `me` ist die Karte nur zum Anschauen (z. B. im Tooltip). */
  me?: PlayerId
  footer: ReactNode
  medallionSize?: number
  /** Wenn gesetzt, sind die Termine anklickbar und springen zum Tag. */
  onPickDay?: (day: string) => void
  /** Wie viele Termine ohne Scrollen sichtbar sind; darüber erscheint ein „+N weitere“-Hinweis. */
  visibleRows?: number
}

/** Vorderseite der Anführer-Karte – im Anführer-Fenster und im Hover-Tooltip. */
export function LeaderFront({
  player,
  stats,
  me,
  footer,
  medallionSize = 150,
  onPickDay,
  visibleRows,
}: FrontProps) {
  const hidden = visibleRows ? Math.max(0, stats.upcoming.length - visibleRows) : 0
  const quote = quoteOf(stats)
  return (
    <>
      <div className="leader-titles">
        <span className="leader-role">{player.title}</span>
        <span className="leader-name">{player.name}</span>
        <span className="leader-era">{quote === null ? 'Noch keine Einträge' : `Zusagequote ${quote} %`}</span>
      </div>

      <div className="leader-medallion">
        <PlayerHead player={player} size={medallionSize} />
      </div>

      <KnownFor player={player} me={me} />

      <div className="leader-progress">
        <h4>▾ Zugesagte Termine</h4>
        {stats.upcoming.length === 0 ? (
          <p className="leader-empty">Keine kommenden Zusagen</p>
        ) : (
          <ul>
            {stats.upcoming.map((a) => (
              <li key={a.day}>
                {(() => {
                  const content = (
                    <>
                      <span className={`status-dot status-dot-${a.status}`} />
                      <span className="leader-date">
                        {format(parseISO(a.day), 'EEEEEE d. MMM', { locale: de })}
                      </span>
                      <span className="leader-time">
                        {a.status === 'maybe' ? STATUS_LABEL.maybe : ''}
                        {a.from_time ? ` ab ${shortTime(a.from_time)}` : ''}
                      </span>
                    </>
                  )
                  return onPickDay ? (
                    <button type="button" className="leader-date-btn" onClick={() => onPickDay(a.day)}>
                      {content}
                    </button>
                  ) : (
                    <span className="leader-date-row">{content}</span>
                  )
                })()}
              </li>
            ))}
          </ul>
        )}
        {hidden > 0 && (
          <p className="leader-more">
            +{hidden} weitere{onPickDay ? ' – scrollen' : ''}
          </p>
        )}
      </div>

      <div className="leader-footer">{footer}</div>
    </>
  )
}

/** Fußzeile von Tooltip/Detail-Panel: Status am Tag, sonst Zahl der Zusagen. */
export function EntryFooter({ stats, entry }: { stats: Stats; entry?: Availability | null }) {
  if (entry === undefined) return <span className="pill-gold">{stats.yes} × Kann</span>
  const status = entry?.status
  return (
    <div className="hovercard-status">
      {status ? (
        <>
          <span className={`status-dot status-dot-${status}`} />
          <b>{STATUS_LABEL[status]}</b>
          {status !== 'no' && entry?.from_time && <span>ab {shortTime(entry.from_time)}</span>}
          {entry?.note && <em>„{entry.note}“</em>}
        </>
      ) : (
        <span className="muted">An diesem Tag noch nichts eingetragen</span>
      )}
    </div>
  )
}

/** „Bekannt für“: wechselt zufällig durch alle Fakten; jeder kann neue hinzufügen. */
function KnownFor({ player, me }: { player: Player; me?: PlayerId }) {
  const { byPlayer, add, remove } = useFacts()
  const facts = byPlayer(player.id)
  const fact = useCycle(facts, me ? 6000 : 4000) // im Tooltip schneller, er ist nur kurz offen
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    const t = text.trim()
    if (!t || !me) return
    setBusy(true)
    setError(null)
    try {
      await add(player.id, t, me)
      setText('')
      setAdding(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function del(id: string) {
    try {
      await remove(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    // Klicks und Tasten hier sollen die Karte nicht umdrehen
    <div
      className="leader-known"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <span className="leader-known-icon" aria-hidden="true">✦</span>
      <div className="leader-known-body">
        <div className="leader-known-head">
          <b>Bekannt für</b>
          {facts.length > 1 && <span className="fact-count">{facts.length} Fakten</span>}
          {!adding && me && (
            <button
              type="button"
              className="fact-add"
              onClick={() => setAdding(true)}
              aria-label={`Fakt über ${player.name} hinzufügen`}
              title="Fakt hinzufügen"
            >
              +
            </button>
          )}
        </div>

        {adding ? (
          <form className="fact-form" onSubmit={submit}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) submit(e)
                if (e.key === 'Escape') setAdding(false)
              }}
              maxLength={160}
              rows={2}
              placeholder={`Wofür ist ${player.name} bekannt?`}
              autoFocus
            />
            <div className="fact-form-actions">
              <span className="fact-chars">{text.length}/160</span>
              <button type="button" onClick={() => setAdding(false)} disabled={busy}>
                Abbrechen
              </button>
              <button type="submit" className="primary" disabled={busy || !text.trim()}>
                {busy ? <span className="spinner" /> : 'Eintragen'}
              </button>
            </div>
          </form>
        ) : fact ? (
          <div key={fact.id} className="fact-wrap fact-swap">
            <p className="fact-text">{fact.text}</p>
            {/* Nur der Autor sieht das Kreuz – für alle anderen bleibt anonym, wer es war */}
            {fact.author === me && (
              <button
                type="button"
                className="fact-delete"
                onClick={() => del(fact.id)}
                aria-label="Diesen Fakt löschen"
                title="Löschen"
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <p className="muted">Die Geschichtsbücher sind noch leer.</p>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}
