import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PlayerId } from '../players'
import type { Availability } from '../types'

const key = (a: Pick<Availability, 'player' | 'day'>) => `${a.player}|${a.day}`

/** Lädt alle Einträge im Zeitraum [from, to] und hält sie per Realtime aktuell. */
export function useAvailability(from: string, to: string) {
  const [entries, setEntries] = useState<Map<string, Availability>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('availability')
      .select('player, day, status, from_time, note')
      .gte('day', from)
      .lte('day', to)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) return setError(error.message)
        setError(null)
        setLoaded(true)
        setEntries(new Map((data as Availability[]).map((a) => [key(a), a])))
      })
    return () => {
      cancelled = true
    }
  }, [from, to])

  const channelId = useId()
  useEffect(() => {
    const channel = supabase
      .channel(`availability-changes-${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability' }, (payload) => {
        setEntries((prev) => {
          const next = new Map(prev)
          if (payload.eventType === 'DELETE') {
            next.delete(key(payload.old as Availability))
          } else {
            const a = payload.new as Availability
            next.set(key(a), a)
          }
          return next
        })
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelId])

  /** Speichert mehrere Einträge in einem Request. */
  const save = useCallback(async (list: Availability[]) => {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('availability')
      .upsert(list.map((a) => ({ ...a, updated_at: now })))
    if (error) throw error
    setEntries((prev) => {
      const next = new Map(prev)
      list.forEach((a) => next.set(key(a), a))
      return next
    })
  }, [])

  /** Löscht die Einträge eines Spielers für mehrere Tage. */
  const remove = useCallback(async (player: PlayerId, days: string[]) => {
    const { error } = await supabase
      .from('availability')
      .delete()
      .eq('player', player)
      .in('day', days)
    if (error) throw error
    setEntries((prev) => {
      const next = new Map(prev)
      days.forEach((day) => next.delete(key({ player, day })))
      return next
    })
  }, [])

  const forDay = useCallback(
    (day: string) => [...entries.values()].filter((a) => a.day === day),
    [entries],
  )

  const all = useMemo(() => [...entries.values()], [entries])

  return { all, forDay, save, remove, error, loaded }
}
