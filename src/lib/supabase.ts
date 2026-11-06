import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const SHARED_EMAIL =
  (import.meta.env.VITE_SHARED_EMAIL as string | undefined) ?? 'civ@wanncivspielen.local'

export const isConfigured = Boolean(url && anonKey)

// Platzhalter, damit die App ohne .env.local nicht sofort crasht (zeigt dann einen Hinweis)
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing')
