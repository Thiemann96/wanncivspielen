import { useSyncExternalStore } from 'react'
import { PLAYERS, type PlayerId } from '../players'
import { supabase } from './supabase'

/**
 * Kopfbilder liegen im privaten Supabase-Storage-Bucket `heads` (nicht im Repo).
 * Nach dem Login holen wir einmal signierte URLs; fehlt ein Bild dort, nutzt
 * `PlayerHead` die lokale Datei aus `public/heads/` (nur lokal vorhanden).
 */
const BUCKET = 'heads'
const VALID_SECONDS = 60 * 60 * 24 * 7

let urls: Partial<Record<PlayerId, string>> = {}
let requested = false
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Lädt die signierten URLs (einmal pro Seitenaufruf, erst nach dem Login aufrufen). */
export function loadHeads() {
  if (requested) return
  requested = true
  supabase.storage
    .from(BUCKET)
    .createSignedUrls(
      PLAYERS.map((p) => `${p.id}.jpg`),
      VALID_SECONDS,
    )
    .then(({ data, error }) => {
      if (error || !data) {
        requested = false // beim nächsten Login erneut versuchen
        return
      }
      const next: Partial<Record<PlayerId, string>> = {}
      data.forEach((d, i) => {
        if (d.signedUrl && !d.error) next[PLAYERS[i].id] = d.signedUrl
      })
      urls = next
      listeners.forEach((l) => l())
    })
}

/** Signierte URL des Kopfbilds oder undefined, solange (noch) keine da ist. */
export function useHeadUrl(id: PlayerId): string | undefined {
  return useSyncExternalStore(subscribe, () => urls[id])
}
