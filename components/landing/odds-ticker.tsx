import { edgeOf, formatEdge, formatOdds } from '@/lib/format-lt'
import { type LandingSignal, landingSignals, SIGNALS_CAPTURED_LABEL } from '@/lib/landing-signals'
import { BookMark } from './book-mark'

const valuePrice = (signal: LandingSignal) => signal.prices.find((price) => price.book === signal.valueBook) ?? signal.prices[0]

/**
 * A scoreboard ticker of real signals from one scan. Pure CSS: it runs before
 * any JavaScript loads, pauses on hover, and stands still for reduced motion.
 */
export function OddsTicker() {
  const items = landingSignals.map((signal) => {
    const price = valuePrice(signal)
    return { id: signal.id, book: price.book, event: price.event, selection: price.selection, odds: price.odds, edge: edgeOf(price.odds, signal.fairOdds) }
  })

  return (
    <section aria-label={`Signalų pavyzdžiai iš skenavimo ${SIGNALS_CAPTURED_LABEL}`} className="group relative overflow-hidden border-t border-rail bg-night-deep">
      <ul className="flex w-max animate-[ticker_52s_linear_infinite] py-3.5 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[...items, ...items].map((item, index) => (
          <li
            key={`${item.id}-${index}`}
            aria-hidden={index >= items.length}
            className="flex shrink-0 items-center gap-3 pr-12 text-[0.95rem] whitespace-nowrap"
          >
            <BookMark book={item.book} size="sm" />
            <span className="font-medium">{item.event}</span>
            <span className="text-haze">{item.selection}</span>
            <span className="font-display text-[1.25rem] leading-none font-bold tnum">{formatOdds(item.odds)}</span>
            <span className="font-semibold text-floodlight">{formatEdge(item.edge)}</span>
          </li>
        ))}
      </ul>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-night-deep to-transparent sm:w-32" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-night-deep to-transparent sm:w-32" />
    </section>
  )
}
