import { createContext, useContext, type ReactNode } from 'react'
import { useAvailability } from '../hooks/useAvailability'
import type { Availability } from '../types'

interface AllAvailability {
  all: Availability[]
  error: string | null
  /** true, sobald der erste Ladevorgang durch ist */
  loaded: boolean
}

const Ctx = createContext<AllAvailability | null>(null)

/** Alle Einträge aller Zeiten, einmal geladen und per Realtime aktuell – für Statistiken und Tooltips. */
export function AllAvailabilityProvider({ children }: { children: ReactNode }) {
  const { all, error, loaded } = useAvailability('2000-01-01', '2999-12-31')
  return <Ctx.Provider value={{ all, error, loaded }}>{children}</Ctx.Provider>
}

export function useAllAvailability() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAllAvailability muss innerhalb von <AllAvailabilityProvider> verwendet werden')
  return ctx
}
