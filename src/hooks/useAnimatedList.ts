import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

export interface AnimatedItem<T> {
  key: string
  item: T
  leaving: boolean
}

/**
 * Hält entfernte Einträge noch `duration` ms im DOM, damit sie rausanimiert werden können.
 * Sie bleiben an ihrer bisherigen Position in der Liste.
 */
export function useAnimatedList<T>(
  items: T[],
  getKey: (item: T) => string,
  duration = 320,
): AnimatedItem<T>[] {
  const [prev, setPrev] = useState(items)
  const [leaving, setLeaving] = useState<Map<string, { item: T; index: number }>>(new Map())

  // Während des Renderns ableiten (React-Muster für „State aus vorherigen Props“)
  if (prev !== items) {
    const current = new Set(items.map(getKey))
    const next = new Map([...leaving].filter(([k]) => !current.has(k)))
    prev.forEach((item, index) => {
      const k = getKey(item)
      if (!current.has(k)) next.set(k, { item, index })
    })
    setPrev(items)
    setLeaving(next)
  }

  useEffect(() => {
    if (leaving.size === 0) return
    const keys = [...leaving.keys()]
    const t = setTimeout(() => {
      setLeaving((m) => {
        const next = new Map(m)
        keys.forEach((k) => next.delete(k))
        return next
      })
    }, duration)
    return () => clearTimeout(t)
  }, [leaving, duration])

  const result: AnimatedItem<T>[] = items.map((item) => ({ key: getKey(item), item, leaving: false }))
  ;[...leaving]
    .sort((a, b) => a[1].index - b[1].index)
    .forEach(([key, { item, index }]) => {
      result.splice(Math.min(index, result.length), 0, { key, item, leaving: true })
    })
  return result
}

/**
 * FLIP: Kinder mit `data-key` gleiten von ihrer alten an die neue Position,
 * wenn sich die Reihenfolge ändert.
 */
export function useFlip(container: RefObject<HTMLElement | null>, duration = 380) {
  const positions = useRef(new Map<string, number>())

  useLayoutEffect(() => {
    const el = container.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const next = new Map<string, number>()
    el.querySelectorAll<HTMLElement>('[data-key]').forEach((child) => {
      const key = child.dataset.key!
      const top = child.offsetTop
      next.set(key, top)
      const before = positions.current.get(key)
      if (!reduce && before !== undefined && before !== top) {
        child.animate(
          [{ transform: `translateY(${before - top}px)` }, { transform: 'translateY(0)' }],
          { duration, easing: 'cubic-bezier(.2, .9, .3, 1.1)' },
        )
      }
    })
    positions.current = next
  })
}
