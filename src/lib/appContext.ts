import { createContext, useContext } from 'react'
import type { PlayerId } from '../players'

/** Eingeloggter Spieler (für Aktionen in Tooltips). */
export const MeContext = createContext<PlayerId | null>(null)
export const useMe = () => useContext(MeContext)

/** Springt im Kalender zu einem Tag und öffnet ihn – nur innerhalb des Kalenders verfügbar. */
export const PickDayContext = createContext<((day: string) => void) | null>(null)
export const usePickDay = () => useContext(PickDayContext)
