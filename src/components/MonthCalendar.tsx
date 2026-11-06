import { useMemo, useRef, useState, type TouchEvent } from 'react'
import {
  addDays,
  addMonths,
  addWeeks,
  getISOWeek,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  parseISO,
} from 'date-fns'
import { de } from 'date-fns/locale'
import type { PlayerId } from '../players'
import { useAvailability } from '../hooks/useAvailability'
import { DayCell } from './DayCell'
import { DayEditor } from './DayEditor'
import { Suggestions } from './Suggestions'
import { PickDayContext } from '../lib/appContext'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const iso = (d: Date) => format(d, 'yyyy-MM-dd')

type View = 'month' | 'week'
const VIEW_KEY = 'wanncivspielen.view'
const PHONE = '(max-width: 600px)'

/** Gespeicherte Ansicht, sonst: Handy → Woche, sonst Monat. */
function initialView(): View {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    if (v === 'month' || v === 'week') return v
  } catch {
    /* egal */
  }
  return window.matchMedia(PHONE).matches ? 'week' : 'month'
}

const weekStart = (d: Date) => startOfWeek(d, { weekStartsOn: 1 })
const startOf = (view: View, d: Date) => (view === 'month' ? startOfMonth(d) : weekStart(d))

function title(view: View, start: Date) {
  if (view === 'month') return format(start, 'MMMM yyyy', { locale: de })
  const end = addDays(start, 6)
  const from = format(start, start.getMonth() === end.getMonth() ? 'd.' : 'd. MMM', { locale: de })
  return `${from} – ${format(end, 'd. MMM yyyy', { locale: de })}`
}

export function MonthCalendar({ me }: { me: PlayerId }) {
  const [view, setView] = useState<View>(initialView)
  // Beginn des angezeigten Zeitraums (Monatserster bzw. Montag)
  const [month, setMonth] = useState(() => startOf(view, new Date()))
  const [dir, setDir] = useState<'next' | 'prev' | null>(null)
  // Auswahl: gewählte Tage (yyyy-MM-dd), Ankertag für Shift-Bereiche, Position fürs Popover
  const [selection, setSelection] = useState<{ days: string[]; anchor: string; rect: DOMRect } | null>(
    null,
  )

  function goTo(target: Date) {
    const t = startOf(view, target)
    if (t.getTime() === month.getTime()) return
    setDir(t > month ? 'next' : 'prev')
    setSelection(null)
    setMonth(t)
  }

  const step = (n: number) => goTo(view === 'month' ? addMonths(month, n) : addWeeks(month, n))

  function switchView(next: View) {
    if (next === view) return
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      /* egal */
    }
    // Monat → Woche: diese Woche, falls heute im Monat liegt, sonst die erste Woche des Monats
    const now = new Date()
    const anchor = next === 'week' && isSameMonth(now, month) ? now : month
    setView(next)
    setDir(null)
    setSelection(null)
    setMonth(startOf(next, anchor))
  }

  // Wischen links/rechts blättert (nur Touch, nur eindeutig waagerecht)
  const touch = useRef<{ x: number; y: number } | null>(null)
  function onTouchEnd(e: TouchEvent) {
    const start = touch.current
    touch.current = null
    if (!start || e.changedTouches.length !== 1) return
    const dx = e.changedTouches[0].clientX - start.x
    const dy = e.changedTouches[0].clientY - start.y
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1)
  }

  const days = useMemo(
    () =>
      view === 'month'
        ? eachDayOfInterval({ start: weekStart(month), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) })
        : eachDayOfInterval({ start: month, end: addDays(month, 6) }),
    [month, view],
  )

  const today = startOfDay(new Date())
  // Sichtbares Raster plus die nächsten 8 Wochen für die Vorschläge
  const gridFrom = iso(days[0])
  const gridTo = iso(days.at(-1)!)
  const todayIso = iso(today)
  const horizon = iso(addDays(today, 56))
  const { all, forDay, save, remove, error } = useAvailability(
    gridFrom < todayIso ? gridFrom : todayIso,
    gridTo > horizon ? gridTo : horizon,
  )
  const selectable = days.filter((d) => !isBefore(d, today)).map(iso)

  function handleClick(day: string, rect: DOMRect, mods: { range: boolean; toggle: boolean }) {
    setSelection((sel) => {
      if (mods.range && sel) {
        const [a, b] = [sel.anchor, day].sort()
        const range = selectable.filter((d) => d >= a && d <= b)
        // Shift+⌘ erweitert die bestehende Auswahl, nur Shift ersetzt sie
        const base = mods.toggle ? sel.days : []
        return { days: [...new Set([...base, ...range])].sort(), anchor: sel.anchor, rect }
      }
      if (mods.toggle && sel) {
        const has = sel.days.includes(day)
        const next = has ? sel.days.filter((d) => d !== day) : [...sel.days, day].sort()
        return next.length ? { days: next, anchor: day, rect } : null
      }
      return { days: [day], anchor: day, rect }
    })
  }

  /** Aus der Sidebar: in den Monat/die Woche springen und den Tag mit Popover auswählen. */
  function pickDay(day: string) {
    const target = startOf(view, parseISO(day))
    const switching = target.getTime() !== month.getTime()
    goTo(target)
    // Nach dem Monatswechsel (Slide-Animation) die Zelle suchen und dort öffnen
    setTimeout(
      () => {
        const el = document.querySelector<HTMLElement>(`.day[data-day="${day}"]`)
        if (el) setSelection({ days: [day], anchor: day, rect: el.getBoundingClientRect() })
      },
      switching ? 340 : 0,
    )
  }

  return (
    <PickDayContext.Provider value={pickDay}>
      <div className={`layout layout-${view}`}>
        <section className="panel calendar-panel">
          <div className="panel-header calendar-nav">
            <div className="view-toggle" role="group" aria-label="Ansicht">
              <button className={view === 'week' ? 'active' : ''} onClick={() => switchView('week')}>
                Woche
              </button>
              <button className={view === 'month' ? 'active' : ''} onClick={() => switchView('month')}>
                Monat
              </button>
            </div>
            <div className="calendar-nav-main">
              <button
                className="icon-btn"
                onClick={() => step(-1)}
                aria-label={view === 'month' ? 'Vorheriger Monat' : 'Vorherige Woche'}
              >
                ‹
              </button>
              <h2 key={`${view}-${iso(month)}`} className={dir ? `title-${dir}` : ''}>
                {title(view, month)}
                {view === 'week' && <small className="week-no">KW {getISOWeek(month)}</small>}
              </h2>
              <button
                className="icon-btn"
                onClick={() => step(1)}
                aria-label={view === 'month' ? 'Nächster Monat' : 'Nächste Woche'}
              >
                ›
              </button>
            </div>
            <button className="today-btn" onClick={() => goTo(new Date())}>
              Heute
            </button>
          </div>

          <div
            className="panel-body"
            onTouchStart={(e) => {
              const t = e.touches[0]
              touch.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null
            }}
            onTouchEnd={onTouchEnd}
          >
            {error && <p className="error">Fehler beim Laden: {error}</p>}
            {view === 'month' && (
              <div className="grid weekdays">
                {WEEKDAYS.map((w) => (
                  <div key={w} className={`weekday ${w === 'Sa' || w === 'So' ? 'weekday-weekend' : ''}`}>
                    {w}
                  </div>
                ))}
              </div>
            )}
            <div
              key={`${view}-${iso(month)}`}
              className={`${view === 'month' ? 'grid' : 'week-list'} ${dir ? `slide-${dir}` : ''}`}
            >
              {days.map((d) => (
                <DayCell
                  key={iso(d)}
                  date={d}
                  entries={forDay(iso(d))}
                  inMonth={view === 'week' || isSameMonth(d, month)}
                  isPast={isBefore(d, today)}
                  isToday={isToday(d)}
                  isSelected={!!selection?.days.includes(iso(d))}
                  onClick={(rect, mods) => handleClick(iso(d), rect, mods)}
                />
              ))}
            </div>
          </div>
        </section>

        {selection && (
          <DayEditor
            days={selection.days}
            anchor={selection.rect}
            me={me}
            forDay={forDay}
            onSave={save}
            onDelete={remove}
            onClose={() => setSelection(null)}
          />
        )}
        <Suggestions all={all} onPick={pickDay} />
      </div>
    </PickDayContext.Provider>
  )
}
