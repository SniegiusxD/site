'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useId, useMemo, useRef } from 'react'
import { formatInteger } from '@/lib/format-lt'
import { monthProgress } from '@/lib/month-progress'
import { useApi } from '@/lib/use-api'
import { useFocusTrap } from '@/lib/use-focus-trap'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { LoadError } from './load-error'

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * The daily target over the whole month: bets so far against the month's goal,
 * where the member should be by today, and one bar per day against the target.
 */
export function MonthDialog({ open, onClose, dailyTarget, now }: { open: boolean; onClose: () => void; dailyTarget: number; now: Date }) {
  const reduced = useReducedMotion()
  const titleId = useId()
  // Asked each time the dialog opens. A failure says so rather than drawing
  // an empty month, which would read as "no bets".
  const { data, error, loading, reload } = useApi<{ bets: Array<{ placedAtIso?: string }> }>(open ? '/api/bets' : null)
  const placed = useMemo(
    () => (data ? data.bets.map((bet) => ({ placedAt: bet.placedAtIso ?? '' })).filter((bet) => bet.placedAt) : null),
    [data],
  )

  // Focus moves in, stays in, and returns to the "Mėnuo" button; Escape closes.
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, open, onClose)

  const m = useMemo(() => (placed ? monthProgress(placed, now, dailyTarget) : null), [placed, now, dailyTarget])
  const peak = m ? Math.max(dailyTarget, ...m.perDay) * 1.15 : 1
  const behind = m ? m.pace : 0

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-night/70 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
            initial={reduced ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: 40, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="lift max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-stand p-6 sm:max-w-[44rem] sm:rounded-3xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id={titleId} className="text-[2rem]">
                {m?.label ?? 'Mėnuo'}
              </h2>
              <button type="button" onClick={onClose} aria-label="Uždaryti" className="grid size-10 place-items-center rounded-full text-haze hover:bg-rail hover:text-chalk">
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {!m && error && !loading ? (
              <LoadError error={error} what="mėnesio statymų" onRetry={reload} className="my-10" />
            ) : !m ? (
              <p role="status" className="py-16 text-center text-haze">
                Skaičiuojam…
              </p>
            ) : (
              <div className="mt-4 grid gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div>
                  <p className="font-display text-[3.2rem] leading-none font-extrabold tnum">
                    {formatInteger(m.total)}
                    <span className="ml-2 text-[1.1rem] font-medium text-haze">iš {formatInteger(m.monthTarget)} statymų</span>
                  </p>
                  {/* The bar is the month; the tick is where the target says you should be today. */}
                  <div className="relative mt-5 h-2.5 rounded-full bg-rail">
                    <motion.div
                      className="h-full rounded-full bg-floodlight"
                      initial={reduced ? false : { width: 0 }}
                      animate={{ width: `${Math.min(100, (m.total / Math.max(1, m.monthTarget)) * 100)}%` }}
                      transition={{ duration: 0.7, ease: EASE }}
                    />
                    <span
                      aria-hidden
                      className="absolute -top-1 -bottom-1 w-0.5 rounded bg-chalk"
                      style={{ left: `${Math.min(100, (m.expectedByToday / Math.max(1, m.monthTarget)) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 flex justify-between gap-3 text-[0.9rem] text-haze">
                    <span>Pagal tikslą šiandien turėtum turėti {formatInteger(m.expectedByToday)}</span>
                    <span className={`shrink-0 font-semibold tnum ${behind >= 0 ? 'text-pitch' : 'text-warning'}`}>
                      {behind >= 0 ? '+' : '−'}
                      {Math.abs(Math.round(behind * 100))} %
                    </span>
                  </p>
                  <dl className="mt-6 grid grid-cols-3 gap-3">
                    <Stat label="Dienų pasiektas tikslas" value={`${m.daysReached} iš ${m.today}`} />
                    <Stat label="Statymų per dieną" value={m.averagePerDay.toLocaleString('lt-LT', { maximumFractionDigits: 1 })} />
                    <Stat label="Tokiu tempu per mėnesį" value={formatInteger(m.projected)} />
                  </dl>
                </div>

                <figure>
                  <figcaption className="text-[0.85rem] text-haze">Diena po dienos, tikslas {dailyTarget}</figcaption>
                  <div className="relative mt-3 h-40">
                    <span
                      aria-hidden
                      className="absolute inset-x-0 border-t border-dashed border-rail-strong"
                      style={{ bottom: `${(dailyTarget / peak) * 100}%` }}
                    />
                    <div className="absolute inset-0 flex items-end gap-[2px]" aria-hidden>
                      {m.perDay.map((count, index) => {
                        const day = index + 1
                        const future = day > m.today
                        const reached = count >= dailyTarget && dailyTarget > 0
                        return (
                          <div key={day} className="group relative flex h-full flex-1 items-end" title={`${day} d.: ${count}`}>
                            <motion.div
                              className={`w-full rounded-t-[3px] ${
                                future ? 'bg-rail/40' : reached ? 'bg-floodlight' : 'bg-steel'
                              } ${day === m.today ? 'outline outline-1 outline-offset-1 outline-chalk' : ''}`}
                              initial={reduced ? false : { height: 0 }}
                              animate={{ height: future ? '2px' : `${Math.max(count ? 4 : 2, (count / peak) * 100)}%` }}
                              transition={{ duration: 0.5, delay: reduced ? 0 : Math.min(index, 30) * 0.015, ease: EASE }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="relative mt-2 h-4 text-[0.8rem] text-haze-dim tnum">
                    <span className="absolute left-0">1</span>
                    {/* Under today's own bar, unless it would collide with an end label. */}
                    {m.today > 2 && m.today < m.daysInMonth - 1 && (
                      <span
                        className="absolute -translate-x-1/2 font-semibold text-chalk"
                        style={{ left: `${((m.today - 0.5) / m.daysInMonth) * 100}%` }}
                      >
                        {m.today}
                      </span>
                    )}
                    <span className="absolute right-0">{m.daysInMonth}</span>
                  </div>
                  <table className="sr-only">
                    <caption>Statymai per dieną</caption>
                    <tbody>
                      {m.perDay.slice(0, m.today).map((count, index) => (
                        <tr key={index}>
                          <th scope="row">{index + 1}</th>
                          <td>{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </figure>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-1.5 text-[0.8rem] text-haze">{label}</dt>
      <dd className="font-display text-[1.5rem] leading-none font-bold tnum">{value}</dd>
    </div>
  )
}
