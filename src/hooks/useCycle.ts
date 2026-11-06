import { useEffect, useState } from 'react'

/**
 * Wählt zufällig ein Element aus `items` und wechselt alle `interval` ms zu einem anderen.
 * Gibt `null` zurück, wenn die Liste leer ist.
 */
export function useCycle<T>(items: T[], interval = 6000): T | null {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * 1000))
  const len = items.length

  useEffect(() => {
    if (len < 2) return
    const t = setInterval(() => {
      // nie zweimal hintereinander dasselbe
      setIndex((i) => (i % len) + 1 + Math.floor(Math.random() * (len - 1)))
    }, interval)
    return () => clearInterval(t)
  }, [len, interval])

  return len ? items[index % len] : null
}
