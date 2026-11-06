import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { PlayerId } from '../players'
import type { Fact } from '../types'

interface FactsApi {
  byPlayer: (player: PlayerId) => Fact[]
  add: (player: PlayerId, text: string, author: PlayerId) => Promise<void>
  remove: (id: string) => Promise<void>
}

const FactsContext = createContext<FactsApi | null>(null)

/** Lädt alle Fakten einmal und hält sie per Realtime aktuell – geteilt von allen Komponenten. */
export function FactsProvider({ children }: { children: ReactNode }) {
  const [facts, setFacts] = useState<Map<string, Fact>>(new Map())

  useEffect(() => {
    let cancelled = false
    supabase
      .from('facts')
      .select('id, player, text, author, created_at')
      .order('created_at')
      .then(({ data, error }) => {
        if (cancelled || error) return
        setFacts(new Map((data as Fact[]).map((f) => [f.id, f])))
      })

    const channel = supabase
      .channel('facts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facts' }, (payload) => {
        setFacts((prev) => {
          const next = new Map(prev)
          if (payload.eventType === 'DELETE') next.delete((payload.old as Fact).id)
          else next.set((payload.new as Fact).id, payload.new as Fact)
          return next
        })
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  const byPlayer = useCallback(
    (player: PlayerId) => [...facts.values()].filter((f) => f.player === player),
    [facts],
  )

  const add = useCallback(async (player: PlayerId, text: string, author: PlayerId) => {
    const { data, error } = await supabase
      .from('facts')
      .insert({ player, text, author })
      .select('id, player, text, author, created_at')
      .single()
    if (error) throw error
    setFacts((prev) => new Map(prev).set((data as Fact).id, data as Fact))
  }, [])

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('facts').delete().eq('id', id)
    if (error) throw error
    setFacts((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const api = useMemo(() => ({ byPlayer, add, remove }), [byPlayer, add, remove])
  return <FactsContext.Provider value={api}>{children}</FactsContext.Provider>
}

export function useFacts() {
  const ctx = useContext(FactsContext)
  if (!ctx) throw new Error('useFacts muss innerhalb von <FactsProvider> verwendet werden')
  return ctx
}
