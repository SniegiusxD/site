'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, Check, Clock, Loader2, Minus, Plus } from 'lucide-react'
import Link from 'next/link'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { BookMark } from '@/components/landing/book-mark'
import { CopyButton } from '@/components/landing/copy-button'
import { type BoardBet, boardStake, type Exposure, exposureFor, toBoardBet } from '@/lib/exposure'
import { formatEdge, formatEuro, formatOdds, formatPercent, ltPlural } from '@/lib/format-lt'
import { BOOKS } from '@/lib/landing-signals'
import type { LivePrice, LiveSignal } from '@/lib/live-signals'
import { clockLabel, kickoffLabel, ltSelection, timeUntilLabel } from '@/lib/live-view'
import { sportName } from '@/lib/sports-lt'
import { trackBet } from '@/lib/track-bet'
import { useAccount } from './account-provider'

const EASE = [0.22, 1, 0.36, 1] as const

export function SignalDetail({
  signal,
  price,
  now,
  bets,
  signalsById,
  onTracked,
  onClose,
}: {
  signal: LiveSignal
  price: LivePrice
  now: Date
  bets: BoardBet[]
  signalsById: Map<string, LiveSignal>
  onTracked?: (bet: BoardBet) => void
  onClose?: () => void
}) {
  const reduced = useReducedMotion()
  const { account } = useAccount()
  const prefs = account.preferences
  const stakeId = useId()

  const limit = prefs.bookLimits[price.book]
  const exposure = exposureFor(signal, bets, signalsById)
  const sizing = boardStake(prefs, signal, price, exposure)
  const max = Math.max(1, Math.floor(limit ?? prefs.bankroll))

  const [stake, setStake] = useState(sizing.suggested)
  const [stakeText, setStakeText] = useState(String(sizing.suggested))
  const [tracking, setTracking] = useState<'idle' | 'pending' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  const open = signal.status === 'open'
  const setStakeValue = (value: number) => {
    const clamped = Math.max(0, Math.min(max, Math.round(value)))
    setStake(clamped)
    setStakeText(String(clamped))
  }
  const step = stake < 20 ? 1 : 5

  const prices = [...signal.prices].sort((a, b) => b.odds - a.odds)
  const low = Math.min(signal.fairOdds, ...prices.map((p) => p.odds)) * 0.94
  const high = Math.max(signal.fairOdds, ...prices.map((p) => p.odds)) * 1.02
  const at = (odds: number) => ((odds - low) / (high - low)) * 100
  const fairAt = at(signal.fairOdds)

  async function track() {
    if (stake <= 0) {
      setError('Įrašyk sumą.')
      return
    }
    setTracking('pending')
    setError(null)
    const result = await trackBet(signal, price, stake)
    if (result.ok) {
      setTracking('done')
      toast.success(`Pridėta: ${formatEuro(stake)} už ${formatOdds(price.odds)}`, {
        description: `${price.book}, ${ltSelection(price.selectionLabel)}`,
      })
      onTracked?.(toBoardBet(result.bet))
    } else {
      setTracking('idle')
      setError(result.error)
    }
  }

  return (
    <article className="mx-auto max-w-[46rem] px-4 pt-4 pb-32 sm:px-8 lg:pt-8 lg:pb-12">
      <div className="flex items-center gap-2.5 text-[0.95rem] text-haze">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Atgal į sąrašą"
              className="-ml-2 grid size-10 place-items-center rounded-xl text-chalk hover:bg-stand"
            >
              <ArrowLeft className="size-5" aria-hidden />
            </button>
          )}
          <BookMark book={price.book} size="sm" />
        <p className="min-w-0">
          {sportName(signal.sport)}, {kickoffLabel(signal.startsAt)}
          {open && <span className="text-haze-dim">, {timeUntilLabel(signal.startsAt, now)}</span>}
        </p>
      </div>

      <div className="mt-5 flex items-start justify-between gap-3">
        <h2 className="text-[2.1rem] sm:text-[2.6rem]">{price.eventName}</h2>
        <CopyButton text={price.eventName} label={`${price.book}: ${price.eventName}`} className="mt-1 shrink-0" />
      </div>

      {!open && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="mt-6 flex items-start gap-3 rounded-2xl bg-stand p-5 hairline"
        >
          <Clock className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
          <div>
            <p className="font-medium">{signal.status === 'started' ? 'Rungtynės prasidėjo' : 'Ši vertė užsidarė'}</p>
            <p className="mt-1 text-[0.95rem] text-haze">
              {signal.status === 'started'
                ? 'Signalas nebegalioja.'
                : `Kaina pasikeitė ir paskutiniame skenavime vertės nebeliko${signal.closedAt ? ` (${clockLabel(signal.closedAt)})` : ''}. Jei jau pastatei, statymą vis tiek gali pažymėti.`}
            </p>
          </div>
        </motion.div>
      )}

      <div className="mt-6 rounded-2xl bg-stand p-5 hairline sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.9rem] text-haze">Statymas {price.book}</p>
            <p className="mt-1 text-[1.2rem] font-medium">{ltSelection(price.selectionLabel)}</p>
          </div>
          <div className="text-right">
            <p className={`font-display text-5xl leading-none font-bold tnum ${open ? 'text-floodlight' : 'text-haze-dim line-through'}`}>
              {formatEdge(price.edge)}
            </p>
            <p className="mt-1 text-[0.85rem] text-haze">tavo vertė</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-night/60 p-4">
            <p className="text-[0.85rem] text-haze">Tikroji kaina</p>
            <p className="mt-1 font-display text-3xl font-bold tnum">{formatOdds(signal.fairOdds)}</p>
          </div>
          <div className="rounded-xl bg-floodlight-soft p-4">
            <p className="text-[0.85rem] text-floodlight">{price.book} siūlo</p>
            <p className="mt-1 font-display text-3xl font-bold text-floodlight tnum">{formatOdds(price.odds)}</p>
          </div>
        </div>
      </div>

      <section className="mt-4 rounded-2xl bg-stand p-5 hairline sm:p-6" aria-label="Kainos visose kontorose">
        <h3 className="text-[1.5rem]">Kainos visose kontorose</h3>
        <div className="mt-5 space-y-4">
          {prices.map((row) => {
            const rowAt = at(row.odds)
            const clears = row.odds > signal.fairOdds
            return (
              <div key={row.book}>
                <div className="grid grid-cols-[auto_5.25rem_minmax(0,1fr)_3.25rem] items-center gap-3">
                  <BookMark book={row.book} size="sm" />
                  <span className="text-[0.95rem]">{row.book}</span>
                  <span aria-hidden className="relative h-2.5 rounded-full bg-rail">
                    <span className="absolute inset-y-0 left-0 rounded-l-full bg-steel" style={{ width: `${Math.min(rowAt, fairAt)}%` }} />
                    {clears && (
                      <motion.span
                        initial={reduced ? false : { width: 0 }}
                        animate={{ width: `${rowAt - fairAt}%` }}
                        transition={{ duration: 0.6, ease: EASE }}
                        className="absolute inset-y-0 rounded-r-full bg-floodlight"
                        style={{ left: `${fairAt}%` }}
                      />
                    )}
                    <span className="absolute -inset-y-1.5 w-0.5 rounded bg-chalk" style={{ left: `calc(${fairAt}% - 1px)` }} />
                  </span>
                  <span className={`text-right font-semibold ${clears ? 'text-floodlight' : ''}`}>{formatOdds(row.odds)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 pl-9">
                  <span className="truncate text-[0.85rem] text-haze-dim">{row.eventName}</span>
                  <CopyButton text={row.eventName} label={`${row.book}: ${row.eventName}`} className="shrink-0" />
                </div>
              </div>
            )
          })}
          {BOOKS.filter((book) => !signal.prices.some((p) => p.book === book)).map((book) => (
            <div key={book} className="grid grid-cols-[auto_5.25rem_minmax(0,1fr)] items-center gap-3">
              <BookMark book={book} size="sm" />
              <span className="text-[0.95rem] text-haze-dim">{book}</span>
              <span className="text-[0.85rem] text-haze-dim">kainos neradom</span>
            </div>
          ))}
        </div>
        <p className="mt-5 border-t border-rail pt-4 text-[0.9rem] text-haze">
          Balta linija: tikroji kaina {formatOdds(signal.fairOdds)}.
          {signal.pinnacleOdds ? ` Pinnacle su marža siūlo ${formatOdds(signal.pinnacleOdds)}.` : ''}
        </p>
      </section>

      {(exposure.selection.count > 0 || exposure.match.count > 0) && tracking !== 'done' && (
        <ExposureNotice exposure={exposure} kelly={sizing.kelly} remaining={sizing.remaining} />
      )}

      <section className="mt-4 rounded-2xl bg-stand p-5 hairline sm:p-6" aria-label="Statymo suma">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h3 className="text-[1.5rem]">Suma</h3>
          <p className="text-[0.9rem] text-haze">
            Kelly siūlo {formatEuro(sizing.kelly)}
            {limit !== undefined && `, ${price.book} limitas ${formatEuro(limit)}`}
          </p>
        </div>
        <div className="mt-5 flex items-center justify-between gap-4">
          <button
            type="button"
            aria-label={`Mažinti sumą ${step} €`}
            onClick={() => setStakeValue(stake - step)}
            className="grid size-12 shrink-0 place-items-center rounded-xl bg-rail transition-colors hover:bg-rail-strong active:scale-95"
          >
            <Minus className="size-5" aria-hidden />
          </button>
          <div className="flex min-w-0 items-baseline justify-center gap-2">
            <label htmlFor={stakeId} className="sr-only">
              Statymo suma eurais
            </label>
            <input
              id={stakeId}
              inputMode="numeric"
              value={stakeText}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, '')
                setStakeText(digits)
                setStake(Math.min(max, Number(digits || 0)))
              }}
              onBlur={() => setStakeValue(stake)}
              style={{ width: `${Math.max(1, stakeText.length) * 0.62 + 0.3}em` }}
              className="bg-transparent text-center font-display text-6xl font-bold outline-none"
            />
            <span className="font-display text-4xl font-bold text-haze">€</span>
          </div>
          <button
            type="button"
            aria-label={`Didinti sumą ${step} €`}
            disabled={stake >= max}
            onClick={() => setStakeValue(stake + step)}
            className="grid size-12 shrink-0 place-items-center rounded-xl bg-rail transition-colors hover:bg-rail-strong active:scale-95 disabled:opacity-40"
          >
            <Plus className="size-5" aria-hidden />
          </button>
        </div>
        <p className="mt-1 text-center text-[0.9rem] text-haze">
          {prefs.bankroll > 0 ? `${formatPercent(stake / prefs.bankroll)} bankrollo` : 'Bankrollas tuščias'}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 text-[0.95rem]">
          <div className="rounded-xl bg-night/60 p-3.5">
            <p className="text-haze">Galimas laimėjimas</p>
            <p className="mt-0.5 font-semibold">+{formatEuro(stake * (price.odds - 1), 2)}</p>
          </div>
          <div className="rounded-xl bg-night/60 p-3.5">
            <p className="text-haze">Išmoka</p>
            <p className="mt-0.5 font-semibold">{formatEuro(stake * price.odds, 2)}</p>
          </div>
        </div>
      </section>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-brick-soft px-4 py-3 text-brick">
          {error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-rail bg-night/90 p-4 backdrop-blur-xl lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        {tracking === 'done' ? (
          <p className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-pitch-soft font-semibold text-pitch">
            <Check className="size-5" aria-hidden />
            Pažymėta.{' '}
            <Link href="/statymai" className="underline underline-offset-4">
              Žiūrėti statymus
            </Link>
          </p>
        ) : (
          <button
            type="button"
            onClick={track}
            disabled={tracking === 'pending'}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-chalk text-[1.05rem] font-semibold text-night transition-transform hover:bg-white active:scale-[0.98] disabled:opacity-70"
          >
            {tracking === 'pending' && <Loader2 className="size-5 animate-spin" aria-hidden />}
            Pastačiau {formatEuro(stake)} už {formatOdds(price.odds)}
          </button>
        )}
      </div>
    </article>
  )
}

function ExposureNotice({ exposure, kelly, remaining }: { exposure: Exposure; kelly: number; remaining: number }) {
  const { selection, match } = exposure
  const full = selection.staked > 0 && remaining === 0
  const share = kelly > 0 ? Math.min(1, selection.staked / kelly) : 1
  return (
    <section aria-label="Jau pastatyta" className="mt-4 rounded-2xl bg-[rgb(245_165_36/0.08)] p-5 shadow-[inset_0_0_0_1px_rgb(245_165_36/0.3)] sm:p-6">
      <p className="flex items-start gap-2.5 font-medium text-warning">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          {selection.count > 0
            ? `Šitą statymą jau pažymėjai: ${formatEuro(selection.staked)}`
            : `${match.count} ${ltPlural(match.count, 'statymas', 'statymai', 'statymų')} šiose rungtynėse, ${formatEuro(match.staked)}`}
        </span>
      </p>
      <p className="mt-2 text-[0.95rem] text-haze">
        {selection.count > 0
          ? full
            ? 'Visa Kelly suma šiai krypčiai jau pastatyta, todėl siūloma suma 0 €. Didesnė suma kitoje kontoroje padidintų riziką, o ne vertę.'
            : `Siūloma suma sumažinta iki ${formatEuro(remaining)}, kad kartu su ankstesniu statymu neviršytum Kelly sumos.`
          : 'Kitos tų pačių rungtynių linijos dažnai laimi arba pralaimi kartu. Įvertink, ar nori dar vieno.'}
      </p>
      {selection.count > 0 && kelly > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-[0.85rem]">
            <span className="text-haze">Ši kryptis</span>
            <span className={full ? 'font-semibold text-brick' : 'text-chalk'}>
              {formatEuro(selection.staked)} iš {formatEuro(kelly)}
            </span>
          </div>
          <div aria-hidden className="mt-1.5 h-2 overflow-hidden rounded-full bg-rail">
            <div className={`h-full rounded-full ${full ? 'bg-brick' : 'bg-warning'}`} style={{ width: `${share * 100}%` }} />
          </div>
        </div>
      )}
    </section>
  )
}
