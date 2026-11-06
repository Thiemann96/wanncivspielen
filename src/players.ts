export type PlayerId = 'max' | 'julian' | 'yannick' | 'eric'

export interface Player {
  id: PlayerId
  name: string
  title: string // Beiname auf Anführer- und Login-Karte
  color: string // Fallback, solange es kein Kopfbild gibt
  head: string // lokaler Fallback; online kommen die Bilder aus Supabase Storage (src/lib/heads.ts)
}

const heads = `${import.meta.env.BASE_URL}heads/`

export const PLAYERS: Player[] = [
  { id: 'max', name: 'Max', title: 'der Prophet', color: '#e76f51', head: `${heads}max.jpg` },
  { id: 'julian', name: 'Julian', title: 'der Perverse', color: '#2a9d8f', head: `${heads}julian.jpg` },
  { id: 'yannick', name: 'Yannick', title: 'der Stille', color: '#e9c46a', head: `${heads}yannick.jpg` },
  { id: 'eric', name: 'Eric', title: 'der Reiche', color: '#6a4c93', head: `${heads}eric.jpg` },
]

export const playerById = (id: PlayerId) => PLAYERS.find((p) => p.id === id)!
