/** Zeitalter, die man mit gespielten Civ-Abenden erreicht. `from` = nötige Abende. */
export const ERAS = [
  { name: 'Antike', icon: '🏺', from: 0 },
  { name: 'Klassik', icon: '🏛', from: 1 },
  { name: 'Mittelalter', icon: '🏰', from: 3 },
  { name: 'Renaissance', icon: '🎨', from: 6 },
  { name: 'Industriezeitalter', icon: '⚙', from: 10 },
  { name: 'Moderne', icon: '✈', from: 15 },
  { name: 'Atomzeitalter', icon: '☢', from: 21 },
  { name: 'Informationszeitalter', icon: '💾', from: 28 },
] as const

export type Era = (typeof ERAS)[number]

/** Index des Zeitalters für eine Anzahl gespielter Abende. */
export function eraIndex(nights: number): number {
  let i = 0
  while (i + 1 < ERAS.length && nights >= ERAS[i + 1].from) i++
  return i
}
