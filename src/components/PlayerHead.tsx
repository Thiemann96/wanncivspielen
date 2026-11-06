import { useState } from 'react'
import type { Player } from '../players'
import { useHeadUrl } from '../lib/heads'

interface Props {
  player: Player
  size?: number
  className?: string
}

/** Kopfbild des Spielers; fällt auf einen farbigen Kreis mit Initiale zurück. */
export function PlayerHead({ player, size = 28, className = '' }: Props) {
  // Bild aus Supabase Storage, lokal als Fallback die Datei aus public/heads/
  const src = useHeadUrl(player.id) ?? player.head
  const [broken, setBroken] = useState<string | null>(null)
  const style = { width: size, height: size, fontSize: size * 0.45 }

  if (broken === src) {
    return (
      <span
        className={`head head-fallback ${className}`}
        style={{ ...style, background: player.color }}
      >
        {player.name[0]}
      </span>
    )
  }
  return (
    <img
      className={`head ${className}`}
      style={style}
      src={src}
      alt={player.name}
      onError={() => setBroken(src)}
    />
  )
}
