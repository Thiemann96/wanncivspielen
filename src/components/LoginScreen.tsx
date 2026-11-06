import { useState, type FormEvent } from 'react'
import { SHARED_EMAIL, supabase } from '../lib/supabase'
import { PLAYERS, type PlayerId } from '../players'
import { PlayerHead } from './PlayerHead'
import { QuoteBar } from './QuoteBar'

interface Props {
  loggedIn: boolean
  onPick: (id: PlayerId) => void
}

export function LoginScreen({ loggedIn, onPick }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: SHARED_EMAIL, password })
    setBusy(false)
    if (error) setError('Falsches Passwort.')
  }

  return (
    <div className="login">
      <h1 className="game-title">Wann Civ spielen?</h1>
      <section className="panel login-panel">
        <div className="panel-header">
          <h2>{loggedIn ? 'Wähle deinen Anführer' : 'Zutritt zum Reich'}</h2>
        </div>
        <div className="panel-body">
          {!loggedIn ? (
            <form onSubmit={submit}>
              <input
                type="password"
                placeholder="Gemeinsames Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <button type="submit" className="primary" disabled={busy || !password}>
                {busy ? <span className="spinner" /> : 'Eintreten'}
              </button>
              {error && <p className="error shake">{error}</p>}
            </form>
          ) : (
            <div className="player-pick">
              {PLAYERS.map((p) => (
                <button key={p.id} className="portrait-card" onClick={() => onPick(p.id)}>
                  <span className="portrait-role">{p.title}</span>
                  <PlayerHead player={p} size={112} />
                  <span className="portrait-name">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
      <QuoteBar className="quote-bar-login" />
    </div>
  )
}
