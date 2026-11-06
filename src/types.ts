import type { PlayerId } from './players'

export type Status = 'yes' | 'maybe' | 'no'

export interface Availability {
  player: PlayerId
  day: string // yyyy-MM-dd
  status: Status
  from_time: string | null // "19:00:00"
  note: string | null
}

export const STATUS_LABEL: Record<Status, string> = {
  yes: 'Kann',
  maybe: 'Vielleicht',
  no: 'Kann nicht',
}

export const shortTime = (t: string | null) => (t ? t.slice(0, 5) : null)

export interface Fact {
  id: string
  player: PlayerId
  text: string
  author: PlayerId
  created_at: string
}

export type LogKind = 'announce' | 'report' | 'friendship' | 'reconcile' | 'slander'

/** targeted: kann an bestimmte Spieler gerichtet werden */
export const LOG_KINDS: Record<LogKind, { label: string; long: string; icon: string; targeted: boolean }> = {
  announce: { label: 'Ankündigung', long: 'Ankündigung', icon: '📯', targeted: false },
  report: { label: 'Bericht', long: 'Bericht', icon: '📜', targeted: false },
  friendship: { label: 'Freundschaft', long: 'Freundschaftsbekundung', icon: '🤝', targeted: true },
  reconcile: { label: 'Versöhnung', long: 'Versöhnung', icon: '🕊️', targeted: true },
  slander: { label: 'Verleumdung', long: 'Verleumdung', icon: '🗡️', targeted: true },
}
export const LOG_KIND_ORDER = Object.keys(LOG_KINDS) as LogKind[]

export interface LogEntry {
  id: string
  author: PlayerId
  kind: LogKind
  text: string
  quote_id: string | null
  targets: PlayerId[]
  created_at: string
}

export interface LogReaction {
  entry_id: string
  player: PlayerId
  emoji: string
}

export const LOG_REACTIONS = ['👍', '😂', '😮', '😡', '🤝', '⚔️', '💀'] as const
