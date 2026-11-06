import { useMemo, useRef } from 'react'
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns'
import { de } from 'date-fns/locale'
import { PLAYERS } from '../players'
import { shortTime, type Availability } from '../types'
import { useAnimatedList, useFlip } from '../hooks/useAnimatedList'
import { HoverCard } from './HoverCard'
import { PlayerHead } from './PlayerHead'

const HORIZON = 56 // Tage in die Zukunft
const MAX = 6

interface Suggestion {
  day: string
  yes: number
  maybe: number
  start: string | null
  entries: Availability[]
}

function relative(day: string) {
  const diff = differenceInCalendarDays(parseISO(day), startOfDay(new Date()))
  if (diff === 0) return 'heute'
  if (diff === 1) return 'morgen'
  if (diff === 2) return 'übermorgen'
  return `in ${diff} Tagen`
}

/** Beste kommende Tage: zuerst die meisten Zusagen, dann „vielleicht“, dann das frühere Datum. */
function suggest(all: Availability[]): Suggestion[] {
  const today = startOfDay(new Date())
  const from = format(today, 'yyyy-MM-dd')
  const to = format(addDays(today, HORIZON), 'yyyy-MM-dd')

  const byDay = new Map<string, Availability[]>()
  for (const a of all) {
    if (a.day < from || a.day > to) continue
    byDay.set(a.day, [...(byDay.get(a.day) ?? []), a])
  }

  return [...byDay]
    .map(([day, entries]) => {
      const yesEntries = entries.filter((a) => a.status === 'yes')
      const times = yesEntries.map((a) => a.from_time).filter((t): t is string => !!t).sort()
      return {
        day,
        entries,
        yes: yesEntries.length,
        maybe: entries.filter((a) => a.status === 'maybe').length,
        start: shortTime(times.at(-1) ?? null),
      }
    })
    .filter((s) => s.yes + s.maybe > 0)
    .sort((a, b) => b.yes - a.yes || b.maybe - a.maybe || a.day.localeCompare(b.day))
    .slice(0, MAX)
}

interface Props {
  all: Availability[]
  onPick: (day: string) => void
}

export function Suggestions({ all, onPick }: Props) {
  const suggestions = useMemo(() => suggest(all), [all])
  const list = useAnimatedList(suggestions, (s) => s.day)
  const ref = useRef<HTMLOListElement>(null)
  useFlip(ref)

  return (
    <aside className="panel suggestions">
      <div className="panel-header">
        <h3>Beste Termine</h3>
      </div>
      <p className="suggestions-sub">Die nächsten 8 Wochen</p>

      {list.length === 0 && (
        <p className="suggestions-empty">Noch keine Zusagen. Trag ein, wann du kannst!</p>
      )}

      <ol ref={ref}>
        {list.map(({ key, item: s, leaving }, i) => {
          const full = s.yes === PLAYERS.length
          const rank = list.slice(0, i).filter((x) => !x.leaving).length + 1
          return (
            <li
              key={key}
              data-key={key}
              className={`suggestion ${full ? 'suggestion-full' : ''} ${leaving ? 'leaving' : ''}`}
            >
              <button type="button" onClick={() => onPick(s.day)} disabled={leaving}>
                <span key={rank} className="rank">
                  {rank}
                </span>
                <span className="suggestion-body">
                  <span className="suggestion-date">
                    {format(parseISO(s.day), 'EEEEEE, d. MMM', { locale: de })}
                    <small>{relative(s.day)}</small>
                  </span>
                  <span className="suggestion-heads">
                    {PLAYERS.map((p) => {
                      const a = s.entries.find((e) => e.player === p.id)
                      return (
                        <HoverCard key={p.id} player={p} entry={a ?? null}>
                          {a ? (
                            <span className={`ring ring-${a.status}`}>
                              <PlayerHead player={p} size={46} />
                            </span>
                          ) : (
                            <span className="head-empty" />
                          )}
                        </HoverCard>
                      )
                    })}
                  </span>
                  {full && (
                    <span className="suggestion-civ">
                      Civ-Abend{s.start ? ` ab ${s.start}` : ''}!
                    </span>
                  )}
                </span>
                <span className="score">
                  <b key={s.yes}>{s.yes}</b>/{PLAYERS.length}
                  {s.maybe > 0 && <small>+{s.maybe}?</small>}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
