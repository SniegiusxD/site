import { edgeOf, formatEdge, formatOdds } from '@/lib/format-lt'
import { landingSignals } from '@/lib/landing-signals'

const items = landingSignals.map((signal) => {
  const price = signal.prices.find((item) => item.book === signal.valueBook) ?? signal.prices[0]
  return { id: signal.id, event: price.event, book: price.book, odds: formatOdds(price.odds), value: formatEdge(edgeOf(price.odds, signal.fairOdds)) }
})

/**
 * Two lines of real captured signals moving in opposite directions. Pure CSS: each
 * list holds two copies, so half its width is one seamless loop. Pauses on hover.
 */
export function OddsTicker() {
  const reversed = [...items].reverse()
  return (
    <div
      aria-label="Paskutiniai signalai"
      className="grid gap-[5px] overflow-hidden border-y border-rail bg-[#0a2c21] py-[9px] [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent)]"
    >
      <ul className="kr-marquee flex w-max">
        {[...items, ...items].map((item, index) => (
          <li
            key={`${item.id}-${index}`}
            aria-hidden={index >= items.length}
            className="flex items-center gap-2.5 border-r border-rail px-5 text-[0.875rem] whitespace-nowrap text-haze"
          >
            <span className="text-chalk">{item.event}</span>
            <span>{item.book}</span>
            <span className="font-semibold text-chalk tnum">{item.odds}</span>
            <span className="font-semibold text-floodlight tnum">{item.value}</span>
          </li>
        ))}
      </ul>
      <ul aria-hidden className="kr-marquee-slow flex w-max">
        {[...reversed, ...reversed].map((item, index) => (
          <li
            key={`${item.id}-slow-${index}`}
            className="flex items-center gap-[9px] border-r border-stand-hover px-[18px] text-[0.8125rem] whitespace-nowrap text-haze-dim"
          >
            <span>{item.event}</span>
            <span>{item.book}</span>
            <span className="font-semibold tnum">{item.odds}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
