import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { Player } from '../players'
import type { Availability } from '../types'
import { LeaderSheet } from '../components/LeaderSheet'

export interface LeaderSheetRequest {
  player: Player
  /** Eintrag für den Kontext (Tag), wie beim Tooltip. */
  entry?: Availability | null
  /** Sprung zum Tag im Kalender – wird vom Auslöser mitgegeben, weil das Panel außerhalb des Kalenders hängt. */
  pickDay?: ((day: string) => void) | null
}

const LeaderSheetContext = createContext<((r: LeaderSheetRequest) => void) | null>(null)

/**
 * Detailansicht eines Anführers als Panel von unten (für Touch-Geräte).
 * Hängt zentral in der App, damit es offen bleibt, auch wenn der angetippte Kopf verschwindet (z. B. Toast).
 */
export function LeaderSheetProvider({ children }: { children: ReactNode }) {
  const [req, setReq] = useState<(LeaderSheetRequest & { n: number }) | null>(null)
  const open = useCallback((r: LeaderSheetRequest) => setReq((prev) => ({ ...r, n: (prev?.n ?? 0) + 1 })), [])

  return (
    <LeaderSheetContext.Provider value={open}>
      {children}
      {req && (
        <LeaderSheet
          key={req.n}
          player={req.player}
          entry={req.entry}
          pickDay={req.pickDay ?? undefined}
          onClose={() => setReq(null)}
        />
      )}
    </LeaderSheetContext.Provider>
  )
}

export const useLeaderSheet = () => useContext(LeaderSheetContext)
