'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { betsByDay, monthGrid, vilniusDay } from '@/lib/bets-calendar'
import { formatEuro, ltPlural } from '@/lib/format-lt'
import type { ActiveBet } from '@/lib/types'

// Adapted from the 21st.dev component "Returns Calendar" by ssicevs (retrieved
// 2026-09-14): cells tinted by the size of the gain or loss in one up and one
// down hue, a read-out that dims unrelated cells on hover, and a cumulative
// curve. Reworked from years × months into one month of days, in this site's
// palette and Lithuanian.

const EASE = [0.16, 1, 0.3, 1] as const
const UP = 'var(--pitch)'
const DOWN = 'var(--brick)'
const WEEKDAYS = ['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk']
const MONTHS = ['Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis', 'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis']
const MONTHS_GENITIVE = ['sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio', 'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio']

const signedEuro = (value: number) => `${value > 0 ? '+' : ''}${formatEuro(value, 2)}`

/** Tint grows with the size of the day's result relative to the month's largest day. A flat day stays neutral. */
const cellFill = (profit: number, scale: number, on: boolean) =>
  Math.abs(profit) < 0.005
    ? on
      ? 'var(--rail-strong)'
      : 'var(--rail)'
    : `color-mix(in srgb, ${profit > 0 ? UP : DOWN} ${Math.round(Math.min(Math.abs(profit) / scale, 1) * 48 + (on ? 26 : 12))}%, transparent)`

export function ProfitCalendar({ bets }: { bets: ActiveBet[] }) {
  const reduced = useReducedMotion()
  const today = vilniusDay(new Date())
  const [month, setMonth] = useState(() => ({ year: Number(today.slice(0, 4)), index: Number(today.slice(5, 7)) - 1 }))
  const [hot, setHot] = useState<string | null>(null)

  const days = useMemo(() => betsByDay(bets), [bets])
  const weeks = useMemo(() => monthGrid(month.year, month.index), [month])
  const prefix = `${month.year}-${String(month.index + 1).padStart(2, '0')}`

  const monthDays = useMemo(
    () => [...days.values()].filter((day) => day.date.startsWith(prefix)).sort((a, b) => a.date.localeCompare(b.date)),
    [days, prefix],
  )
  const totals = useMemo(() => {
    const profit = monthDays.reduce((sum, day) => sum + day.profit, 0)
    const staked = monthDays.reduce((sum, day) => sum + day.staked, 0)
    const settled = monthDays.reduce((sum, day) => sum + day.settled, 0)
    const pending = monthDays.reduce((sum, day) => sum + day.pending, 0)
    return { profit, staked, settled, pending, roi: staked > 0 ? profit / staked : null }
  }, [monthDays])
  const scale = Math.max(1, ...monthDays.map((day) => Math.abs(day.profit)))

  // Cumulative profit through the month, day by day.
  const curve = useMemo(() => {
    let running = 0
    const byDate = new Map(monthDays.map((day) => [day.date, day.profit]))
    return weeks.flat().filter((date): date is string => Boolean(date)).map((date) => {
      running += byDate.get(date) ?? 0
      return running
    })
  }, [weeks, monthDays])

  const shift = (delta: number) => {
    setHot(null)
    setMonth(({ year, index }) => {
      const next = index + delta
      return { year: year + Math.floor(next / 12), index: ((next % 12) + 12) % 12 }
    })
  }

  const hotDay = hot ? days.get(hot) : undefined
  const readout = hot
    ? `${MONTHS_GENITIVE[Number(hot.slice(5, 7)) - 1]} ${Number(hot.slice(8, 10))} d.: ${
        hotDay?.settled ? signedEuro(hotDay.profit) : 'užbaigtų statymų nėra'
      }${hotDay?.pending ? `, ${hotDay.pending} laukia` : ''}`
    : 'Užvesk ant dienos, kad pamatytum rezultatą'

  const W = 600
  const H = 64
  const lo = Math.min(0, ...curve)
  const hi = Math.max(0, ...curve)
  const span = hi - lo || 1
  const px = (i: number) => 4 + (i / Math.max(1, curve.length - 1)) * (W - 8)
  const py = (v: number) => 6 + (1 - (v - lo) / span) * (H - 12)
  const points = curve.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`)
  const endValue = curve.at(-1) ?? 0
  const hue = endValue >= 0 ? UP : DOWN

  return (
    <section className="mt-6 rounded-2xl bg-stand p-5 hairline sm:p-6" aria-label="Rezultatai pagal dieną">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(-1)} aria-label="Ankstesnis mėnuo" className="grid size-9 place-items-center rounded-lg text-haze hover:bg-stand-hover hover:text-chalk">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <h2 className="min-w-[9.5rem] text-center text-[1.6rem]">
            {MONTHS[month.index]} <span className="font-sans text-base font-normal text-haze">{month.year}</span>
          </h2>
          <button type="button" onClick={() => shift(1)} aria-label="Kitas mėnuo" className="grid size-9 place-items-center rounded-lg text-haze hover:bg-stand-hover hover:text-chalk">
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
        <p className="text-[0.9rem] text-haze" aria-live="polite">
          {readout}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-1.5" onPointerLeave={() => setHot(null)}>
        {WEEKDAYS.map((day, i) => (
          <span key={day} className="pb-1 text-center text-[0.75rem] text-haze-dim" style={{ opacity: hot && (new Date(`${hot}T12:00:00Z`).getUTCDay() + 6) % 7 !== i ? 0.5 : 1 }}>
            {day}
          </span>
        ))}
        {weeks.flat().map((date, cell) => {
          if (!date) return <span key={`pad-${cell}`} />
          const day = days.get(date)
          const on = hot === date
          const settled = Boolean(day?.settled)
          return (
            <motion.button
              key={date}
              type="button"
              aria-label={`${MONTHS_GENITIVE[month.index]} ${Number(date.slice(8))} d.${settled ? `, ${signedEuro(day!.profit)}` : ''}${day?.pending ? `, ${day.pending} laukia` : ''}`}
              onPointerEnter={() => setHot(date)}
              onFocus={() => setHot(date)}
              className="relative flex aspect-square flex-col justify-between rounded-md p-1 text-left outline-none sm:aspect-[1.25] sm:p-1.5"
              style={{
                background: settled ? cellFill(day!.profit, scale, on) : on ? 'var(--stand-hover)' : 'rgb(30 42 68 / 0.45)',
                boxShadow: date === today ? 'inset 0 0 0 1.5px var(--chalk)' : on && settled ? `inset 0 0 0 1.5px ${day!.profit >= 0 ? UP : DOWN}` : undefined,
              }}
              initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : 0.7 }}
              animate={{ opacity: hot && !on ? 0.55 : 1, scale: 1 }}
              transition={reduced ? { duration: 0 } : { duration: 0.3, ease: EASE, delay: 0.01 * cell }}
            >
              {/* Text on a tinted cell sits on its own dark pill, so it reads at any tint. */}
              <span className={`self-start text-[0.7rem] sm:text-[0.8rem] ${settled ? 'rounded bg-night/80 px-1 text-chalk' : 'text-haze'}`}>
                {Number(date.slice(8))}
              </span>
              {settled && Math.abs(day!.profit) >= 1 && (
                <span className="hidden self-end rounded bg-night/80 px-1 text-[0.8rem] font-semibold text-chalk sm:block">
                  {day!.profit > 0 ? '+' : '−'}
                  {Math.round(Math.abs(day!.profit))}
                </span>
              )}
              {day?.pending ? <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-chalk" aria-hidden /> : null}
            </motion.button>
          )
        })}
      </div>

      <div className="mt-5 grid gap-4 border-t border-rail pt-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <dl className="flex gap-6">
          <div>
            <dt className="text-[0.8rem] text-haze">Mėnuo</dt>
            <dd className={`font-display text-2xl font-bold tnum ${totals.profit > 0 ? 'text-pitch' : totals.profit < 0 ? 'text-brick' : ''}`}>
              {signedEuro(totals.profit)}
            </dd>
          </div>
          <div>
            <dt className="text-[0.8rem] text-haze">Grąža</dt>
            <dd className="font-display text-2xl font-bold tnum">
              {totals.roi === null ? '–' : `${totals.roi > 0 ? '+' : ''}${(totals.roi * 100).toFixed(1).replace('.', ',')} %`}
            </dd>
          </div>
          <div>
            <dt className="text-[0.8rem] text-haze">Užbaigta</dt>
            <dd className="font-display text-2xl font-bold tnum">
              {totals.settled}{' '}
              <span className="font-sans text-sm font-normal text-haze">{ltPlural(totals.settled, 'statymas', 'statymai', 'statymų')}</span>
            </dd>
          </div>
        </dl>
        {totals.settled > 0 && (
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-16 w-full" role="img" aria-label={`Mėnesio rezultatas ${signedEuro(endValue)}`}>
            <line x1={4} x2={W - 4} y1={py(0)} y2={py(0)} stroke="var(--rail-strong)" strokeDasharray="4 4" />
            <path d={`M${points.join(' L')} L ${px(curve.length - 1)},${py(0)} L ${px(0)},${py(0)} Z`} fill={`color-mix(in srgb, ${hue} 12%, transparent)`} />
            <motion.path
              d={`M${points.join(' L')}`}
              fill="none"
              stroke={hue}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reduced ? 0 : 0.6, ease: EASE }}
            />
          </svg>
        )}
      </div>
    </section>
  )
}
