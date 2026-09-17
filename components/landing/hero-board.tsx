'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { edgeOf, formatEdge, formatEuro, formatInteger, formatOdds, kellyFraction } from '@/lib/format-lt'
import { BOOKS, type BookName, type LandingSignal, SIGNALS_CAPTURED_LABEL, landingSignals } from '@/lib/landing-signals'
import type { PublicStats } from '@/lib/public-stats'
import { useReducedMotion } from '@/lib/use-reduced-motion'

const DEMO_BANKROLL = 500
const CYCLE_MS = 6500
const DRIFT_MS = 2600
const VISIBLE = 2
const LOCKED = 3

type Filter = 'Visos' | BookName
type Sort = 'value' | 'time'

const valuePrice = (signal: LandingSignal) => signal.prices.find((price) => price.book === signal.valueBook) ?? signal.prices[0]
const edgeFor = (signal: LandingSignal) => edgeOf(valuePrice(signal).odds, signal.fairOdds)

/** "rugs. 14 d. 18:45" → a sortable key; every captured kickoff is in September. */
function kickoffKey(label: string): number {
  const match = label.match(/(\d+) d\. (\d+):(\d+)/)
  return match ? Number(match[1]) * 1440 + Number(match[2]) * 60 + Number(match[3]) : 0
}

/** Quarter Kelly, never more than 5 % of the bankroll: the app's own rule. */
const stakeFor = (signal: LandingSignal) =>
  DEMO_BANKROLL * Math.min(0.05, kellyFraction(valuePrice(signal).odds, 1 / signal.fairOdds) * 0.25)

/**
 * The hero board: real captured signals that behave like the app. Every few seconds
 * a new one arrives, competitor prices tick, and the gap past the true price glows.
 * It stops moving the moment the visitor hovers or picks something.
 */
export function HeroBoard({ stats }: { stats: PublicStats | null }) {
  const reduced = useReducedMotion()
  const [filter, setFilter] = useState<Filter>('Visos')
  const [sort, setSort] = useState<Sort>('value')
  const [offset, setOffset] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)
  const [hover, setHover] = useState(false)
  const [toast, setToast] = useState(0)
  const [drift, setDrift] = useState<Record<string, number>>({})
  const board = useRef<HTMLDivElement>(null)
  const onScreen = useRef(true)

  useEffect(() => {
    const element = board.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      onScreen.current = entry.isIntersecting
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const pool = useMemo(() => {
    const filtered = landingSignals.filter((signal) => filter === 'Visos' || signal.valueBook === filter)
    return filtered.sort((a, b) => (sort === 'value' ? edgeFor(b) - edgeFor(a) : kickoffKey(a.kickoffLabel) - kickoffKey(b.kickoffLabel)))
  }, [filter, sort])

  // Rotation decides which signals are in the feed; the feed itself stays sorted.
  const feed = useMemo(() => {
    if (!pool.length) return []
    const start = offset % pool.length
    const window = [...pool.slice(start), ...pool.slice(0, start)].slice(0, VISIBLE + LOCKED)
    return window.sort((a, b) => (sort === 'value' ? edgeFor(b) - edgeFor(a) : kickoffKey(a.kickoffLabel) - kickoffKey(b.kickoffLabel)))
  }, [pool, offset, sort])

  const visible = feed.slice(0, VISIBLE)
  const locked = feed.slice(VISIBLE)
  const open = openId ?? visible[0]?.id ?? null
  const newest = feed[0]

  useEffect(() => {
    if (reduced) return
    const cycle = window.setInterval(() => {
      if (hover || !onScreen.current || document.hidden) return
      setOffset((current) => current + 1)
      setOpenId(null)
      setToast((current) => current + 1)
    }, CYCLE_MS)
    const tick = window.setInterval(() => {
      if (hover || !onScreen.current || document.hidden) return
      setDrift((current) => {
        const next = { ...current }
        for (const signal of landingSignals) {
          const best = valuePrice(signal).odds
          for (const price of signal.prices) {
            if (price.book === signal.valueBook) continue
            const key = `${signal.id}|${price.book}`
            // Competitors wander by a cent or two but never overtake the value price.
            const ceiling = Math.min(0.03, Math.max(0, best - 0.01 - price.odds))
            const moved = (next[key] ?? 0) + (Math.random() < 0.5 ? -0.01 : 0.01)
            next[key] = Math.round(Math.max(-0.03, Math.min(ceiling, moved)) * 100) / 100
          }
        }
        return next
      })
    }, DRIFT_MS)
    const firstToast = window.setTimeout(() => setToast((current) => current || 1), 2600)
    return () => {
      window.clearInterval(cycle)
      window.clearInterval(tick)
      window.clearTimeout(firstToast)
    }
  }, [hover, reduced])

  const best = feed.length ? Math.max(...feed.map(edgeFor)) : 0
  const perDay = stats?.any ?? null

  return (
    <div
      ref={board}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)}
      className="relative overflow-hidden rounded-[20px] bg-stand shadow-[inset_0_0_0_1px_var(--rail),0_30px_80px_-30px_rgb(0_0_0/0.8)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 animate-[kr-scan_9s_cubic-bezier(.45,0,.55,1)_infinite] bg-[linear-gradient(90deg,transparent,rgb(91_229_132/0.5),transparent)]"
      />

      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-b border-rail px-[18px] py-4">
        <span className="font-display text-[1.125rem] font-bold tracking-[-0.02em]">Signalai</span>
        <span className="flex items-center gap-[7px] text-[0.8125rem] text-haze">
          <span aria-hidden className="relative flex size-[18px] items-center justify-center">
            <svg viewBox="0 0 32 32" className="absolute inset-0 size-[18px] -rotate-90">
              <circle cx="16" cy="16" r="13" fill="none" stroke="var(--rail)" strokeWidth="3" />
              <circle
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke="var(--floodlight)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="82"
                className="animate-[kr-ring_30s_linear_infinite]"
              />
            </svg>
            <span className="size-1.5 animate-[kr-pulse_1.8s_ease-in-out_infinite] rounded-full bg-floodlight" />
          </span>
          gyvai
        </span>
        {perDay !== null && <span className="ml-auto text-[0.8125rem] text-haze">{formatInteger(perDay)} per parą</span>}
        <span className={`rounded-full bg-floodlight-soft px-2.5 py-1 text-[0.8125rem] font-semibold text-floodlight ${perDay === null ? 'ml-auto' : ''}`}>
          geriausia {formatEdge(best)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-[18px] pt-3.5 pb-1.5">
        <div role="group" aria-label="Filtruoti pagal kontorą" className="flex flex-wrap gap-2">
          {(['Visos', ...BOOKS] as Filter[]).map((option) => {
            const active = filter === option
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setFilter(option)
                  setOffset(0)
                  setOpenId(null)
                }}
                className={`min-h-11 rounded-full px-[15px] text-[0.875rem] font-semibold transition-[transform,background-color,color] duration-150 hover:-translate-y-px active:scale-[0.97] ${
                  active ? 'bg-chalk text-night' : 'text-haze shadow-[inset_0_0_0_1px_var(--rail)] hover:text-chalk'
                }`}
              >
                {option}
              </button>
            )
          })}
        </div>
        <div role="group" aria-label="Rikiuoti" className="ml-auto flex gap-0.5 rounded-full bg-night p-[3px]">
          {(
            [
              { key: 'value', label: 'Vertė' },
              { key: 'time', label: 'Laikas' },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={sort === option.key}
              onClick={() => setSort(option.key)}
              className={`min-h-11 rounded-full px-[13px] text-[0.8125rem] font-semibold whitespace-nowrap transition-colors duration-150 ${
                sort === option.key ? 'bg-chalk text-night' : 'text-haze hover:text-chalk'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid max-h-[min(64vh,520px)] gap-0.5 overflow-auto px-2 pt-2 pb-1.5 [mask-image:linear-gradient(#000_86%,rgb(0_0_0/0.15))]">
        {visible.map((signal, position) => (
          <SignalRow
            key={`${signal.id}-${offset}`}
            signal={signal}
            drift={drift}
            open={open === signal.id}
            onToggle={() => setOpenId(open === signal.id ? '' : signal.id)}
            enterDelay={offset === 0 ? 900 + position * 60 : 0}
            arrived={offset > 0 && position === 0}
            shimmerDelay={position * 0.9}
          />
        ))}

        {locked.map((signal, position) => (
          <div key={`locked-${signal.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] px-3 py-[13px]">
            <span aria-hidden className="grid min-w-0 gap-[7px] opacity-50 blur-[5px]">
              <span className="flex items-center gap-[9px]">
                <span className="h-3.5 w-[52px] rounded-full bg-haze" />
                <span className="h-[11px] rounded-full bg-haze" style={{ width: [148, 116, 132][position] }} />
              </span>
              <span className="h-[9px] w-[104px] rounded-full bg-rail" />
            </span>
            <span className="grid justify-items-end gap-px">
              <span className="font-display text-[1.25rem] leading-[1.05] font-extrabold tracking-[-0.03em] text-floodlight">{formatEdge(edgeFor(signal))}</span>
              <span className="text-[0.8125rem] text-haze">užrakinta</span>
            </span>
          </div>
        ))}

        <Link
          href="/registracija"
          className="mx-1 mt-1.5 mb-0.5 flex min-h-11 items-center justify-between gap-3 rounded-[14px] bg-stand-hover p-3.5 shadow-[inset_0_0_0_1px_var(--rail)] transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.99]"
        >
          <span className="text-[0.9375rem] font-semibold">
            {perDay !== null ? `Dar ${formatInteger(Math.max(0, perDay - VISIBLE))} signalai šiandien` : 'Visi šios paros signalai viduje'}
          </span>
          <span className="text-[0.9375rem] font-semibold whitespace-nowrap text-floodlight">Atrakinti</span>
        </Link>
      </div>

      {toast > 0 && newest && !reduced && (
        <div
          key={toast}
          aria-hidden
          className="absolute inset-x-3.5 bottom-3.5 flex animate-[kr-toast_3500ms_cubic-bezier(.22,1,.36,1)_both] items-center gap-2.5 rounded-[14px] bg-stand-hover px-3.5 py-3 shadow-[inset_0_0_0_1px_var(--rail),0_20px_44px_-20px_rgb(0_0_0/0.9)]"
        >
          <span className="size-2 shrink-0 rounded-full bg-floodlight" />
          <span className="text-[0.875rem] font-semibold whitespace-nowrap">Naujas signalas</span>
          <span className="min-w-0 truncate text-[0.875rem] text-haze">{valuePrice(newest).event}</span>
          <span className="ml-auto text-[0.875rem] font-semibold whitespace-nowrap text-floodlight">{formatEdge(edgeFor(newest))}</span>
        </div>
      )}

      <p className="px-[18px] pt-3 pb-4 text-[0.8125rem] text-haze">
        Tikri signalai iš mūsų skenavimo, {SIGNALS_CAPTURED_LABEL}. Balta linija yra tikroji kaina, žalia dalis rodo, kiek kontora moka
        virš jos. Suma skaičiuota {DEMO_BANKROLL} € bankrollui.
      </p>
    </div>
  )
}

function SignalRow({
  signal,
  drift,
  open,
  onToggle,
  enterDelay,
  arrived,
  shimmerDelay,
}: {
  signal: LandingSignal
  drift: Record<string, number>
  open: boolean
  onToggle: () => void
  enterDelay: number
  arrived: boolean
  shimmerDelay: number
}) {
  const price = valuePrice(signal)
  const edge = edgeFor(signal)
  const prices = BOOKS.map((book) => {
    const quote = signal.prices.find((item) => item.book === book)
    if (!quote) return { book, odds: null as number | null }
    const moved = book === signal.valueBook ? 0 : (drift[`${signal.id}|${book}`] ?? 0)
    return { book, odds: Math.round((quote.odds + moved) * 1000) / 1000 }
  })
  const top = Math.max(signal.fairOdds, ...prices.map((item) => item.odds ?? 0)) * 1.05
  const fairAt = (signal.fairOdds / top) * 100

  return (
    <div
      className={`rounded-[14px] transition-colors duration-150 ${open ? 'bg-stand-hover' : ''} ${arrived ? 'kr-row-drop' : enterDelay ? 'kr-row-in' : ''}`}
      style={enterDelay ? { animationDelay: `${enterDelay}ms` } : undefined}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] px-3 py-[13px] text-left transition-colors duration-150 hover:bg-stand-hover"
      >
        <span className="grid min-w-0 gap-[3px]">
          <span className="flex min-w-0 items-center gap-[9px]">
            <span className="rounded-full bg-stand-hover px-[9px] py-[3px] text-[0.75rem] font-semibold whitespace-nowrap shadow-[inset_0_0_0_1px_var(--rail)]">
              {price.book}
            </span>
            <span className="min-w-0 truncate text-[0.9375rem]">{price.event}</span>
          </span>
          <span className="truncate text-[0.8125rem] text-haze">
            {signal.sport}, {signal.kickoffLabel}
          </span>
        </span>
        <span className="grid justify-items-end gap-px">
          <span className="font-display text-[1.5rem] leading-[1.05] font-extrabold tracking-[-0.03em] text-floodlight tnum">{formatEdge(edge)}</span>
          <span className="text-[0.8125rem] whitespace-nowrap text-haze">
            koef. <span className="font-semibold text-chalk">{formatOdds(price.odds)}</span>
          </span>
        </span>
        <span aria-hidden className="col-span-2 mt-[7px] flex h-2 items-center">
          <span className="h-1 w-[2%] rounded-l-full bg-rail" />
          <span className="h-1 w-[70%] bg-haze" />
          <span className="h-2 w-0.5 shrink-0 bg-chalk" />
          <span
            className="h-1 origin-left overflow-hidden rounded-r-full bg-floodlight kr-fade"
            style={{ width: `${((Math.min(edge * 100, 8) / 8) * 24).toFixed(2)}%`, animationDelay: `${1500 + shimmerDelay * 60}ms` }}
          >
            <span
              className="block h-1 w-1/2 animate-[kr-shimmer_2.8s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.85),transparent)]"
              style={{ animationDelay: `${shimmerDelay}s` }}
            />
          </span>
          <span className="h-1 flex-1 rounded-r-full bg-night-deep" />
        </span>
      </button>

      {open && (
        <div className="kr-expand grid gap-[11px] px-3 pt-0.5 pb-4">
          <div className="flex flex-wrap justify-between gap-2 text-[0.8125rem] text-haze">
            <span>
              {signal.market}: <span className="text-chalk">{price.selection}</span>
            </span>
            <span>Tikroji kaina {formatOdds(signal.fairOdds)}</span>
          </div>
          {prices.map((item) => (
            <div key={item.book} className="grid grid-cols-[minmax(60px,78px)_minmax(0,1fr)_62px] items-center gap-2.5">
              <span className={`truncate text-[0.8125rem] ${item.odds === null ? 'text-haze' : ''}`}>{item.book}</span>
              {item.odds === null ? (
                <span className="text-[0.8125rem] text-haze">kainos neradom</span>
              ) : (
                <span className="relative flex h-3 rounded-full bg-night-deep">
                  <span
                    className="block h-3 rounded-l-full bg-haze transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
                    style={{ width: `${((Math.min(item.odds, signal.fairOdds) / top) * 100).toFixed(2)}%` }}
                  />
                  <span
                    className="block h-3 rounded-r-full bg-floodlight transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
                    style={{ width: `${((Math.max(0, item.odds - signal.fairOdds) / top) * 100).toFixed(2)}%` }}
                  />
                  <span aria-hidden className="absolute -inset-y-1 w-0.5 bg-chalk" style={{ left: `${fairAt.toFixed(2)}%` }} />
                </span>
              )}
              {item.odds !== null && (
                <span className={`text-right text-[0.9375rem] tnum ${item.odds > signal.fairOdds ? 'font-semibold text-floodlight' : ''}`}>
                  {formatOdds(item.odds)}
                </span>
              )}
            </div>
          ))}
          <p className="text-[0.8125rem] text-haze">
            Pinnacle siūlo {formatOdds(signal.pinnacleOdds)} su marža; be jos tai {formatOdds(signal.fairOdds)}.
          </p>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-rail pt-[11px]">
            <span className="text-[0.8125rem] text-haze">Rekomenduojama suma</span>
            <span className="font-display text-[1.375rem] font-bold tracking-[-0.02em] tnum">{formatEuro(stakeFor(signal), 2)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
