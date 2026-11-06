import { useCycle } from '../hooks/useCycle'
import { QUOTES } from '../lib/quotes'

/** Rotierendes Zitat wie auf einem Ladebildschirm. */
export function QuoteBar({ className = '' }: { className?: string }) {
  const quote = useCycle(QUOTES, 12000)
  if (!quote) return null
  return (
    <figure className={`quote-bar ${className}`} aria-live="polite">
      <div key={quote.text} className="quote-inner">
        <blockquote>„{quote.text}“</blockquote>
        <figcaption>– {quote.by}</figcaption>
      </div>
    </figure>
  )
}
