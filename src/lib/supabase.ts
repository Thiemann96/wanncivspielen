import { createClient } from '@supabase/supabase-js'

// trim(): Beim Einfügen in GitHub-Secrets rutscht gern ein Zeilenumbruch mit hinein
const env = (v: unknown) => (typeof v === 'string' && v.trim()) || undefined

const url = env(import.meta.env.VITE_SUPABASE_URL)
const anonKey = env(import.meta.env.VITE_SUPABASE_ANON_KEY)

export const SHARED_EMAIL = env(import.meta.env.VITE_SHARED_EMAIL) ?? 'civ@wannspielen.local'

export const isConfigured = Boolean(url && anonKey)

// Platzhalter, damit die App ohne .env.local nicht sofort crasht (zeigt dann einen Hinweis)
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing')
