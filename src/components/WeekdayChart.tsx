export const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
export const WEEKDAY_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

export interface WeekdayCount {
  yes: number
  maybe: number
}

interface Props {
  counts: WeekdayCount[] // 7 Einträge, Montag zuerst
  favorite: number | null
}

/**
 * Gestapelte Balken pro Wochentag: „Kann“ (voll) unten, „Vielleicht“ (schraffiert) oben.
 * Farbe ist nie allein Träger der Info: Schraffur, Legende, Tooltip und Tabelle für Screenreader.
 */
export function WeekdayChart({ counts, favorite }: Props) {
  const max = Math.max(1, ...counts.map((c) => c.yes + c.maybe))

  return (
    <figure className="wd-chart">
      <div className="wd-legend" aria-hidden="true">
        <span><i className="wd-swatch wd-swatch-yes" />Kann</span>
        <span><i className="wd-swatch wd-swatch-maybe" />Vielleicht</span>
      </div>

      <div className="wd-plot" aria-hidden="true">
        {counts.map((c, i) => {
          const total = c.yes + c.maybe
          return (
            <div
              key={i}
              className={`wd-col ${favorite === i ? 'wd-col-fav' : ''}`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="wd-tip">
                <b>{WEEKDAY_LONG[i]}</b>
                {c.yes} × Kann · {c.maybe} × Vielleicht
              </span>
              {favorite === i && total > 0 && <span className="wd-value">{total}</span>}
              <div className="wd-stack" style={{ height: `${(total / max) * 100}%` }}>
                {c.maybe > 0 && <span className="wd-seg wd-seg-maybe" style={{ flexGrow: c.maybe }} />}
                {c.yes > 0 && <span className="wd-seg wd-seg-yes" style={{ flexGrow: c.yes }} />}
              </div>
            </div>
          )
        })}
      </div>
      <div className="wd-axis" aria-hidden="true">
        {WEEKDAY_SHORT.map((w, i) => (
          <span key={w} className={favorite === i ? 'wd-axis-fav' : ''}>
            {w}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Einträge pro Wochentag</caption>
        <thead>
          <tr>
            <th>Wochentag</th>
            <th>Kann</th>
            <th>Vielleicht</th>
          </tr>
        </thead>
        <tbody>
          {counts.map((c, i) => (
            <tr key={i}>
              <td>{WEEKDAY_LONG[i]}</td>
              <td>{c.yes}</td>
              <td>{c.maybe}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
