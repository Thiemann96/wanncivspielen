import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useAllAvailability } from '../lib/allAvailability'
import { civNights } from '../lib/civ'
import { ERAS, eraIndex } from '../lib/eras'
import { CivOverlay } from './CivOverlay'

const SEEN_KEY = 'wanncivspielen.era'

function loadSeen(): number {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0
  } catch {
    return 0
  }
}

/** Zeitalter-Abzeichen in der Kopfzeile; steigt mit jedem gespielten Civ-Abend. */
export function EraBadge() {
  const { all, loaded } = useAllAvailability()
  const [seen, setSeen] = useState(loadSeen)

  const played = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    return [...civNights(all).keys()].filter((d) => d < today).length
  }, [all])

  const idx = eraIndex(played)
  const era = ERAS[idx]
  const next = ERAS[idx + 1]
  const progress = next ? (played - era.from) / (next.from - era.from) : 1
  const title = next
    ? `${played} Civ-Abende gespielt · noch ${next.from - played} bis zum Zeitalter ${next.name}`
    : `${played} Civ-Abende gespielt · höchstes Zeitalter erreicht`

  function acknowledge() {
    setSeen(idx)
    try {
      localStorage.setItem(SEEN_KEY, String(idx))
    } catch {
      /* egal */
    }
  }

  if (!loaded) return null
  return (
    <>
      <span className="era-badge" title={title}>
        <span className="era-name">
          <span aria-hidden>{era.icon}</span> {era.name}
        </span>
        <span className="era-progress" aria-hidden>
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </span>
      </span>
      {idx > seen && (
        <CivOverlay
          variant="era"
          kicker="Ein neues Zeitalter beginnt"
          title={era.name}
          subtitle={`${played} gemeinsame${played === 1 ? 'r Civ-Abend hat' : ' Civ-Abende haben'} euch hierher gebracht`}
          onClose={acknowledge}
        >
          <div className="civ-overlay-era-icon" aria-hidden>
            {era.icon}
          </div>
        </CivOverlay>
      )}
    </>
  )
}
