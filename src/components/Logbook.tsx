import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { differenceInDays, format, formatDistanceToNowStrict } from 'date-fns'
import { de } from 'date-fns/locale'
import { PLAYERS, playerById, type PlayerId } from '../players'
import { LOG_KIND_ORDER, LOG_KINDS, LOG_REACTIONS, type LogEntry, type LogKind, type LogReaction } from '../types'
import { loadLastRead, saveLastRead, useLogbook } from '../lib/logbook'
import { PlayerHead } from './PlayerHead'

const MAX_CHARS = 500
const time = (e: LogEntry) => Date.parse(e.created_at)
const targetsOf = (e: LogEntry) => e.targets ?? []

type Filter = 'all' | 'me' | LogKind

/** Button „Logbuch“ in der Kopfzeile mit Zähler für ungelesene Einträge der anderen. */
export function LogbookButton({ me }: { me: PlayerId }) {
  const { entries } = useLogbook()
  const [lastRead, setLastRead] = useState(() => Date.parse(loadLastRead(me)) || 0)
  // Gelesen-Stand beim Öffnen; null = geschlossen. Damit bleiben die Einträge im offenen Fenster als „neu“ markiert.
  const [openedWith, setOpenedWith] = useState<number | null>(null)

  const unread = entries.filter((e) => e.author !== me && time(e) > lastRead).length

  function markRead() {
    const newest = Math.max(0, ...entries.map(time))
    if (newest > lastRead) {
      setLastRead(newest)
      saveLastRead(me, new Date(newest).toISOString())
    }
  }

  return (
    <>
      <button
        className={`logbook-btn ${unread && openedWith === null ? 'has-unread' : ''}`}
        onClick={() => {
          setOpenedWith(lastRead)
          markRead()
        }}
        aria-label={unread ? `Logbuch, ${unread} ungelesen` : 'Logbuch'}
      >
        📜 Logbuch
        {unread > 0 && openedWith === null && (
          <span className="logbook-badge" aria-hidden>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {openedWith !== null && (
        <LogbookDialog
          me={me}
          since={openedWith}
          onClose={() => {
            markRead() // was während des Lesens dazukam, gilt auch als gelesen
            setOpenedWith(null)
          }}
        />
      )}
    </>
  )
}

function LogbookDialog({ me, since, onClose }: { me: PlayerId; since: number; onClose: () => void }) {
  const { entries, byId, reactions, loaded, add, remove, toggleReaction } = useLogbook()
  const [closing, setClosing] = useState(false)
  const [kind, setKind] = useState<LogKind>('announce')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quoteId, setQuoteId] = useState<string | null>(null)
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [targets, setTargets] = useState<PlayerId[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const targeted = LOG_KINDS[kind].targeted
  const textRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const quoted = quoteId ? byId.get(quoteId) : undefined
  // Tastatur nur am Rechner direkt öffnen, auf dem Handy würde sie die Liste verdecken
  const [autoFocus] = useState(() => window.matchMedia('(hover: hover)').matches)

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setClosing(true)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    const t = text.trim()
    if (!t || busy) return
    setBusy(true)
    setError(null)
    try {
      await add(me, kind, t, quoted ? quoted.id : null, targeted ? targets : [])
      setText('')
      setTargets([])
      setQuoteId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konnte nicht gespeichert werden')
    } finally {
      setBusy(false)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter schickt ab, Shift+Enter macht eine neue Zeile
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  function quote(id: string) {
    setQuoteId(id)
    textRef.current?.focus({ preventScroll: true })
  }

  async function react(entryId: string, emoji: string) {
    setPickerFor(null)
    try {
      await toggleReaction(entryId, me, emoji)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reaktion fehlgeschlagen')
    }
  }

  /** Springt zum zitierten Eintrag und lässt ihn kurz aufleuchten */
  function jumpTo(id: string) {
    const find = () => listRef.current?.querySelector<HTMLElement>(`[data-id="${id}"]`)
    let el = find()
    if (!el && filter !== 'all') {
      // Original ist weggefiltert: Filter aufheben, dann springen
      flushSync(() => setFilter('all'))
      el = find()
    }
    if (!el) return
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' })
    if (!calm)
      el.animate(
        [{ boxShadow: '0 0 0 2px #f0d48a, 0 0 18px rgba(240, 212, 138, .6)' }, { boxShadow: '0 0 0 0 transparent' }],
        { duration: 1400, delay: 250, easing: 'ease-out' },
      )
  }

  async function del(id: string) {
    try {
      await remove(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konnte nicht gelöscht werden')
    }
  }

  return createPortal(
    <div
      className={`leaders-backdrop ${closing ? 'leaders-closing' : ''}`}
      onClick={() => setClosing(true)}
      onAnimationEnd={(e) => e.animationName === 'leaders-out' && onClose()}
    >
      <section
        className="panel logbook"
        role="dialog"
        aria-label="Logbuch"
        onClick={(e) => {
          e.stopPropagation()
          setPickerFor(null)
        }}
      >
        <div className="panel-header leaders-header">
          <h2>Logbuch</h2>
          <button className="close-btn" onClick={() => setClosing(true)} aria-label="Schließen">
            ×
          </button>
        </div>

        <form className="logbook-form" onSubmit={submit}>
          <div className="logbook-kinds" role="radiogroup" aria-label="Art des Eintrags">
            {LOG_KIND_ORDER.map((k) => (
              <button
                type="button"
                key={k}
                role="radio"
                aria-checked={kind === k}
                className={`logbook-kind logbook-kind-${k} ${kind === k ? 'active' : ''}`}
                onClick={() => setKind(k)}
              >
                <span aria-hidden>{LOG_KINDS[k].icon}</span> {LOG_KINDS[k].label}
              </button>
            ))}
          </div>
          {targeted && (
            <div className="logbook-targets" role="group" aria-label="Empfänger">
              <span className="logbook-targets-label">An</span>
              {PLAYERS.filter((p) => p.id !== me).map((p) => {
                const on = targets.includes(p.id)
                return (
                  <button
                    type="button"
                    key={p.id}
                    aria-pressed={on}
                    className={`logbook-target ${on ? 'active' : ''}`}
                    onClick={() => setTargets((t) => (on ? t.filter((x) => x !== p.id) : [...t, p.id]))}
                  >
                    <PlayerHead player={p} size={24} /> {p.name}
                  </button>
                )
              })}
              {targets.length === 0 && <span className="logbook-targets-hint muted">alle, wenn niemand gewählt</span>}
            </div>
          )}
          {quoted && (
            <div className="logbook-quote logbook-quote-draft">
              <QuoteContent entry={quoted} />
              <button type="button" className="fact-delete" onClick={() => setQuoteId(null)} aria-label="Zitat entfernen">
                ×
              </button>
            </div>
          )}
          <textarea
            ref={textRef}
            rows={3}
            value={text}
            maxLength={MAX_CHARS}
            autoFocus={autoFocus}
            placeholder={PLACEHOLDER[kind]}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && quoted) {
                e.nativeEvent.stopImmediatePropagation() // Esc nimmt erst das Zitat weg, schließt dann das Fenster
                setQuoteId(null)
              }
              onKeyDown(e)
            }}
          />
          <div className="logbook-form-actions">
            <span className="fact-chars">
              {text.length}/{MAX_CHARS}
              <span className="logbook-keys"> · Shift+Enter für neue Zeile</span>
            </span>
            <button type="submit" className="primary" disabled={!text.trim() || busy}>
              Verlauten lassen
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </form>

        <div className="logbook-filter" role="radiogroup" aria-label="Filter">
          {(['all', 'me', ...LOG_KIND_ORDER] as Filter[]).map((f) => {
            const count = f === 'all' ? entries.length : entries.filter((e) => matches(e, f, me)).length
            if (count === 0 && f !== 'all' && f !== filter) return null
            return (
              <button
                type="button"
                key={f}
                role="radio"
                aria-checked={filter === f}
                className={`logbook-filter-chip logbook-kind-${f} ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Alle' : f === 'me' ? '🎯 An mich' : `${LOG_KINDS[f].icon} ${LOG_KINDS[f].label}`}
                <span className="logbook-filter-count">{count}</span>
              </button>
            )
          })}
        </div>

        <ol className="logbook-list" ref={listRef}>
          {loaded && entries.length === 0 && (
            <li className="logbook-empty muted">Noch ist das Logbuch leer. Wer traut sich zuerst?</li>
          )}
          {entries.filter((e) => matches(e, filter, me)).map((e) => {
            const author = playerById(e.author)
            const fresh = e.author !== me && time(e) > since
            const to = targetsOf(e)
            const toMe = to.includes(me)
            return (
              <li
                key={e.id}
                data-id={e.id}
                className={`logbook-entry logbook-entry-${e.kind} ${fresh ? 'is-new' : ''} ${toMe ? 'to-me' : ''}`}
              >
                <PlayerHead player={author} size={40} />
                <div className="logbook-entry-body">
                  <div className="logbook-entry-head">
                    <span className="logbook-author">
                      <b>{author.name}</b>
                      <small>{author.title}</small>
                    </span>
                    <span className="logbook-tag">
                      <span aria-hidden>{LOG_KINDS[e.kind].icon}</span> {LOG_KINDS[e.kind].long}
                    </span>
                    {fresh && <span className="logbook-new">Neu</span>}
                    <time dateTime={e.created_at} title={format(time(e), 'EEEE, d. MMMM yyyy, HH:mm', { locale: de })}>
                      {when(time(e))}
                    </time>
                    {e.author === me && (
                      <button className="fact-delete logbook-delete" onClick={() => del(e.id)} aria-label="Eintrag löschen">
                        ×
                      </button>
                    )}
                  </div>
                  {to.length > 0 && (
                    <div className="logbook-to">
                      <span className="logbook-to-label">an</span>
                      {to.map((id) => (
                        <span key={id} className={`logbook-to-chip ${id === me ? 'is-me' : ''}`}>
                          <PlayerHead player={playerById(id)} size={20} /> {id === me ? 'dich' : playerById(id).name}
                        </span>
                      ))}
                    </div>
                  )}
                  {e.quote_id &&
                    (byId.get(e.quote_id) ? (
                      <button type="button" className="logbook-quote" onClick={() => jumpTo(e.quote_id!)}>
                        <QuoteContent entry={byId.get(e.quote_id)!} />
                      </button>
                    ) : (
                      <div className="logbook-quote logbook-quote-gone">Zitat aus grauer Vorzeit</div>
                    ))}
                  <p>{e.text}</p>
                  <Reactions
                    me={me}
                    list={reactions.get(e.id) ?? []}
                    picking={pickerFor === e.id}
                    onPick={(emoji) => react(e.id, emoji)}
                    onTogglePicker={() => setPickerFor(pickerFor === e.id ? null : e.id)}
                    onQuote={() => quote(e.id)}
                  />
                </div>
              </li>
            )
          })}
        </ol>
      </section>
    </div>,
    document.body,
  )
}

function matches(e: LogEntry, f: Filter, me: PlayerId) {
  if (f === 'all') return true
  if (f === 'me') return targetsOf(e).includes(me)
  return e.kind === f
}

function QuoteContent({ entry }: { entry: LogEntry }) {
  return (
    <>
      <b>{playerById(entry.author).name}</b>
      <span>{entry.text}</span>
    </>
  )
}

interface ReactionsProps {
  me: PlayerId
  list: LogReaction[]
  picking: boolean
  onPick: (emoji: string) => void
  onTogglePicker: () => void
  onQuote: () => void
}

/** Reaktions-Chips mit Zähler, dazu „Reagieren“ und „Zitieren“ */
function Reactions({ me, list, picking, onPick, onTogglePicker, onQuote }: ReactionsProps) {
  const groups = LOG_REACTIONS.map((emoji) => ({ emoji, players: list.filter((r) => r.emoji === emoji).map((r) => r.player) }))
    .filter((g) => g.players.length > 0)

  return (
    <div className="logbook-reactions" onClick={(e) => e.stopPropagation()}>
      {groups.map((g) => (
        <button
          type="button"
          key={g.emoji}
          className={`reaction-chip ${g.players.includes(me) ? 'mine' : ''}`}
          title={g.players.map((p) => playerById(p).name).join(', ')}
          onClick={() => onPick(g.emoji)}
        >
          <span aria-hidden>{g.emoji}</span> <span className="reaction-count">{g.players.length}</span>
        </button>
      ))}
      <span className="logbook-actions">
        <button type="button" className="logbook-action" onClick={onTogglePicker} aria-expanded={picking} aria-label="Reagieren">
          ☺+
        </button>
        <button type="button" className="logbook-action" onClick={onQuote}>
          ❝ Zitieren
        </button>
      </span>
      {picking && (
        <div className="reaction-picker" role="menu">
          {LOG_REACTIONS.map((emoji, i) => (
            <button
              type="button"
              role="menuitem"
              key={emoji}
              style={{ animationDelay: `${i * 25}ms` }}
              className={list.some((r) => r.emoji === emoji && r.player === me) ? 'mine' : ''}
              onClick={() => onPick(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const PLACEHOLDER: Record<LogKind, string> = {
  announce: 'Was sollen die anderen fürs nächste Mal wissen?',
  slander: 'Wer hat letzte Partie wen verraten?',
  report: 'Was ist passiert?',
  friendship: 'Wem willst du ewige Freundschaft schwören?',
  reconcile: 'Mit wem begräbst du das Kriegsbeil?',
}

function when(t: number) {
  if (Date.now() - t < 60_000) return 'gerade eben'
  if (differenceInDays(Date.now(), t) < 6) return formatDistanceToNowStrict(t, { locale: de, addSuffix: true })
  return format(t, 'EEE d. MMM', { locale: de })
}
