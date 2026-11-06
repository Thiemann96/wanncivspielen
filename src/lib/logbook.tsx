import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { PlayerId } from '../players'
import type { LogEntry, LogKind, LogReaction } from '../types'

const COLUMNS = 'id, author, kind, text, quote_id, targets, created_at'
const reactionKey = (r: LogReaction) => `${r.entry_id}|${r.player}|${r.emoji}`
const LIMIT = 200 // ältere Einträge braucht niemand mehr

interface LogbookApi {
  /** Neueste zuerst */
  entries: LogEntry[]
  byId: Map<string, LogEntry>
  /** Reaktionen je Eintrag */
  reactions: Map<string, LogReaction[]>
  loaded: boolean
  add: (author: PlayerId, kind: LogKind, text: string, quoteId: string | null, targets: PlayerId[]) => Promise<void>
  remove: (id: string) => Promise<void>
  /** Setzt die Reaktion oder nimmt sie zurück */
  toggleReaction: (entryId: string, player: PlayerId, emoji: string) => Promise<void>
}

const LogbookContext = createContext<LogbookApi | null>(null)

/** Lädt das Logbuch einmal zentral und hält es per Realtime aktuell. */
export function LogbookProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<Map<string, LogEntry>>(new Map())
  const [reactionMap, setReactionMap] = useState<Map<string, LogReaction>>(new Map())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('logbook')
      .select(COLUMNS)
      .order('created_at', { ascending: false })
      .limit(LIMIT)
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error) setMap(new Map((data as LogEntry[]).map((e) => [e.id, e])))
        setLoaded(true)
      })
    supabase
      .from('logbook_reactions')
      .select('entry_id, player, emoji')
      .then(({ data, error }) => {
        if (cancelled || error) return
        setReactionMap(new Map((data as LogReaction[]).map((r) => [reactionKey(r), r])))
      })

    const channel = supabase
      .channel('logbook-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logbook' }, (payload) => {
        setMap((prev) => {
          const next = new Map(prev)
          if (payload.eventType === 'DELETE') next.delete((payload.old as LogEntry).id)
          else next.set((payload.new as LogEntry).id, payload.new as LogEntry)
          return next
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logbook_reactions' }, (payload) => {
        setReactionMap((prev) => {
          const next = new Map(prev)
          if (payload.eventType === 'DELETE') next.delete(reactionKey(payload.old as LogReaction))
          else next.set(reactionKey(payload.new as LogReaction), payload.new as LogReaction)
          return next
        })
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  const entries = useMemo(
    () => [...map.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [map],
  )

  const reactions = useMemo(() => {
    const m = new Map<string, LogReaction[]>()
    for (const r of reactionMap.values()) m.set(r.entry_id, [...(m.get(r.entry_id) ?? []), r])
    return m
  }, [reactionMap])

  const add = useCallback(async (author: PlayerId, kind: LogKind, text: string, quoteId: string | null, targets: PlayerId[]) => {
    const { data, error } = await supabase
      .from('logbook')
      .insert({ author, kind, text, quote_id: quoteId, targets })
      .select(COLUMNS)
      .single()
    if (error) throw error
    setMap((prev) => new Map(prev).set((data as LogEntry).id, data as LogEntry))
  }, [])

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('logbook').delete().eq('id', id)
    if (error) throw error
    setMap((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const toggleReaction = useCallback(
    async (entryId: string, player: PlayerId, emoji: string) => {
      const r: LogReaction = { entry_id: entryId, player, emoji }
      const key = reactionKey(r)
      const had = reactionMap.has(key)
      // sofort anzeigen, bei Fehler zurückdrehen
      const apply = (on: boolean) =>
        setReactionMap((prev) => {
          const next = new Map(prev)
          if (on) next.set(key, r)
          else next.delete(key)
          return next
        })
      apply(!had)
      const { error } = had
        ? await supabase.from('logbook_reactions').delete().match(r)
        : await supabase.from('logbook_reactions').insert(r)
      if (error) {
        apply(had)
        throw error
      }
    },
    [reactionMap],
  )

  const api = useMemo(
    () => ({ entries, byId: map, reactions, loaded, add, remove, toggleReaction }),
    [entries, map, reactions, loaded, add, remove, toggleReaction],
  )
  return <LogbookContext.Provider value={api}>{children}</LogbookContext.Provider>
}

export function useLogbook() {
  const ctx = useContext(LogbookContext)
  if (!ctx) throw new Error('useLogbook muss innerhalb von <LogbookProvider> verwendet werden')
  return ctx
}

// ---------- Gelesen-Stand pro Spieler (nur in diesem Browser) ----------

const readKey = (me: PlayerId) => `wanncivspielen.logbook.read.${me}`

export function loadLastRead(me: PlayerId): string {
  try {
    return localStorage.getItem(readKey(me)) ?? ''
  } catch {
    return ''
  }
}

export function saveLastRead(me: PlayerId, value: string) {
  try {
    localStorage.setItem(readKey(me), value)
  } catch {
    /* egal */
  }
}
