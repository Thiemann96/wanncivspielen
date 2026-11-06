import { PLAYERS } from '../players'
import { shortTime, type Availability } from '../types'

/** Spätester „ab“-Zeitpunkt, wenn alle vier zugesagt haben, sonst null. */
export function civNight(entries: Availability[]): { start: string | null } | null {
  const yes = entries.filter((a) => a.status === 'yes')
  if (yes.length < PLAYERS.length) return null
  const times = yes.map((a) => a.from_time).filter((t): t is string => !!t).sort()
  return { start: shortTime(times.at(-1) ?? null) }
}

/** Alle Civ-Abende in einer Liste von Einträgen: Tag (yyyy-MM-dd) → Startzeit. */
export function civNights(all: Iterable<Availability>): Map<string, { start: string | null }> {
  const byDay = new Map<string, Availability[]>()
  for (const a of all) {
    const list = byDay.get(a.day)
    if (list) list.push(a)
    else byDay.set(a.day, [a])
  }
  const nights = new Map<string, { start: string | null }>()
  byDay.forEach((entries, day) => {
    const n = civNight(entries)
    if (n) nights.set(day, n)
  })
  return nights
}
