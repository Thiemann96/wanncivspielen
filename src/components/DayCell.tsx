import { format, isWeekend } from 'date-fns'
import { de } from 'date-fns/locale'
import { PLAYERS, playerById } from '../players'
import { shortTime, type Availability } from '../types'
import { civNight } from '../lib/civ'
import { HoverCard } from './HoverCard'
import { PlayerHead } from './PlayerHead'

interface Props {
  date: Date
  entries: Availability[]
  inMonth: boolean
  isPast: boolean
  isToday: boolean
  isSelected: boolean
  onClick: (rect: DOMRect, mods: { range: boolean; toggle: boolean }) => void
}

export function DayCell({ date, entries, inMonth, isPast, isToday, isSelected, onClick }: Props) {
  const night = civNight(entries)
  const classes = [
    'day',
    isWeekend(date) && 'day-weekend',
    !inMonth && 'day-other-month',
    isPast && 'day-past',
    isToday && 'day-today',
    isSelected && 'day-selected',
    night && 'day-civ',
  ]
    .filter(Boolean)
    .join(' ')

  // Reihenfolge der Köpfe immer gleich
  const sorted = PLAYERS.map((p) => entries.find((a) => a.player === p.id)).filter(
    (a): a is Availability => !!a,
  )

  return (
    <button
      className={classes}
      data-day={format(date, 'yyyy-MM-dd')}
      onClick={(e) =>
        onClick(e.currentTarget.getBoundingClientRect(), {
          range: e.shiftKey,
          toggle: e.metaKey || e.ctrlKey,
        })
      }
      disabled={isPast}
    >
      <span className="day-number">
        {/* Wochentag nur in der Wochenansicht sichtbar */}
        <span className="day-weekday">{format(date, 'EEEEEE', { locale: de })}</span>
        {format(date, 'd')}
      </span>
      {night && (
        <span className="civ-badge">
          <span className="civ-badge-label">Civ-Abend</span>
          {night.start ? ` ab ${night.start}` : ''}!
        </span>
      )}
      <div className="day-heads">
        {sorted.map((a) => (
          <span key={a.player} className={`entry entry-${a.status}`}>
            <HoverCard player={playerById(a.player)} entry={a}>
              <span className={`ring ring-${a.status}`}>
                <PlayerHead player={playerById(a.player)} size={40} />
              </span>
            </HoverCard>
            {a.status !== 'no' && a.from_time && (
              <small>{shortTime(a.from_time)}</small>
            )}
          </span>
        ))}
      </div>
    </button>
  )
}
