import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isConfigured, supabase } from './lib/supabase'
import { PLAYERS, playerById, type PlayerId } from './players'
import { LoginScreen } from './components/LoginScreen'
import { MonthCalendar } from './components/MonthCalendar'
import { PlayerHead } from './components/PlayerHead'
import { HoverCard } from './components/HoverCard'
import { LeaderSheetProvider } from './lib/leaderSheet'
import { LeadersScreen } from './components/LeadersScreen'
import { FactsProvider } from './lib/facts'
import { AllAvailabilityProvider } from './lib/allAvailability'
import { MeContext } from './lib/appContext'
import { CivEvents } from './components/CivEvents'
import { EraBadge } from './components/EraBadge'
import { QuoteBar } from './components/QuoteBar'
import { loadHeads } from './lib/heads'
import { LogbookProvider } from './lib/logbook'
import { LogbookButton } from './components/Logbook'

const PLAYER_KEY = 'wanncivspielen.player'

function loadPlayer(): PlayerId | null {
  try {
    const v = localStorage.getItem(PLAYER_KEY)
    return PLAYERS.some((p) => p.id === v) ? (v as PlayerId) : null
  } catch {
    return null
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [me, setMe] = useState<PlayerId | null>(loadPlayer)
  const [showLeaders, setShowLeaders] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // Kopfbilder erst nach dem Login holen (privater Storage-Bucket)
  useEffect(() => {
    if (session) loadHeads()
  }, [session])

  function pick(id: PlayerId | null) {
    setMe(id)
    try {
      if (id) localStorage.setItem(PLAYER_KEY, id)
      else localStorage.removeItem(PLAYER_KEY)
    } catch {
      /* egal */
    }
  }

  if (!isConfigured) {
    return (
      <div className="login">
        <h1 className="game-title">Wann Civ spielen?</h1>
        <p className="error">
          Supabase ist nicht konfiguriert. Lege eine <code>.env.local</code> nach Vorlage von{' '}
          <code>.env.example</code> an.
        </p>
      </div>
    )
  }
  if (!ready) return null
  if (!session || !me) return <LoginScreen loggedIn={!!session} onPick={pick} />

  return (
    <FactsProvider>
      <LogbookProvider>
      <AllAvailabilityProvider>
        <MeContext.Provider value={me}>
          <LeaderSheetProvider>
            <div className="app">
              <header className="topbar">
                <h1 className="game-title">Wann Civ spielen?</h1>
                <div className="whoami">
                  <EraBadge />
                  <button className="leaders-btn" onClick={() => setShowLeaders(true)}>
                    ✦ Anführer
                  </button>
                  <LogbookButton key={me} me={me} />
                  <HoverCard player={playerById(me)}>
                    <span className="ring ring-yes">
                      <PlayerHead player={playerById(me)} size={44} />
                    </span>
                  </HoverCard>
                  <span className="whoami-name">{playerById(me).name}</span>
                  <button onClick={() => pick(null)}>Wechseln</button>
                  <button onClick={() => supabase.auth.signOut()}>Logout</button>
                </div>
              </header>
              <MonthCalendar me={me} />
              <QuoteBar />
              <CivEvents />
              {showLeaders && <LeadersScreen me={me} onClose={() => setShowLeaders(false)} />}
            </div>
          </LeaderSheetProvider>
        </MeContext.Provider>
      </AllAvailabilityProvider>
      </LogbookProvider>
    </FactsProvider>
  )
}
