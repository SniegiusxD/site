'use client'

import { Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookMark } from '@/components/landing/book-mark'
import { formatEuro, formatOdds, ltPlural } from '@/lib/format-lt'
import { BOOKS, type BookName } from '@/lib/landing-signals'
import { kickoffLabel, ltSelection } from '@/lib/live-view'
import type { ActiveBet, BetStatus } from '@/lib/types'
import { ProfitCalendar } from './profit-calendar'

const STATUS: Record<BetStatus, { label: string; tone: string }> = {
  laukia: { label: 'Laukia', tone: 'bg-rail text-haze' },
  laimeta: { label: 'Laimėta', tone: 'bg-pitch-soft text-pitch' },
  pralaimeta: { label: 'Pralaimėta', tone: 'bg-brick-soft text-brick' },
  grazinta: { label: 'Grąžinta', tone: 'bg-rail text-chalk' },
  neisspresta: { label: 'Neišspręsta', tone: 'bg-rail text-haze-dim' },
}

export function BetsView() {
  const [bets, setBets] = useState<ActiveBet[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/bets', { cache: 'no-store' })
      if (!response.ok) throw new Error()
      const body = await response.json()
      setBets(body.bets)
      setError(null)
    } catch {
      setError('Nepavyko įkelti statymų. Bandyk dar kartą.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const summary = useMemo(() => {
    const list = bets ?? []
    const pending = list.filter((b) => b.status === 'laukia')
    const settled = list.filter((b) => b.status !== 'laukia' && b.status !== 'neisspresta' && b.profit !== null)
    const staked = settled.reduce((sum, b) => sum + b.stake, 0)
    const profit = settled.reduce((sum, b) => sum + (b.profit ?? 0), 0)
    return {
      pending,
      settled: list.filter((b) => b.status !== 'laukia'),
      pendingStake: pending.reduce((sum, b) => sum + b.stake, 0),
      profit,
      roi: staked > 0 ? profit / staked : null,
      won: settled.filter((b) => b.status === 'laimeta').length,
      lost: settled.filter((b) => b.status === 'pralaimeta').length,
      pushed: settled.filter((b) => b.status === 'grazinta').length,
    }
  }, [bets])

  return (
    <main className="mx-auto max-w-[56rem] px-4 pt-6 pb-16 sm:px-8 lg:pt-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[2.4rem] sm:text-[3rem]">Statymai</h1>
        <button
          type="button"
          onClick={load}
          aria-label="Atnaujinti"
          className="grid size-10 place-items-center rounded-xl text-haze transition-colors hover:bg-stand hover:text-chalk"
        >
          <RefreshCw className={`size-5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
        </button>
      </div>
      <p className="mt-2 text-haze">Rezultatai suvedami automatiškai, kai rungtynės baigiasi.</p>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-rail sm:grid-cols-4">
        <Stat label="Rezultatas">
          <span className={summary.profit > 0 ? 'text-pitch' : summary.profit < 0 ? 'text-brick' : ''}>
            {summary.profit > 0 ? '+' : ''}
            {formatEuro(summary.profit, 2)}
          </span>
        </Stat>
        <Stat label="Grąža">
          {summary.roi === null ? '–' : `${summary.roi > 0 ? '+' : ''}${(summary.roi * 100).toFixed(1).replace('.', ',')} %`}
        </Stat>
        <Stat label="Laimėta / pralaimėta">
          {summary.won} / {summary.lost}
          {summary.pushed ? <span className="text-haze"> / {summary.pushed}</span> : null}
        </Stat>
        <Stat label="Laukia">
          {summary.pending.length}{' '}
          <span className="font-sans text-base font-normal text-haze">{formatEuro(summary.pendingStake)}</span>
        </Stat>
      </dl>

      {bets && bets.length > 0 && <ProfitCalendar bets={bets} />}

      {error && <p role="alert" className="mt-6 rounded-xl bg-brick-soft px-4 py-3 text-brick">{error}</p>}

      {bets === null ? (
        <div className="grid place-items-center py-24 text-haze">
          <Loader2 className="size-6 animate-spin" aria-hidden />
        </div>
      ) : bets.length === 0 ? (
        <div className="mt-10 rounded-2xl bg-stand p-8 text-center hairline">
          <p className="font-display text-3xl font-bold">Dar nepažymėjai nė vieno statymo</p>
          <p className="mx-auto mt-3 max-w-[26rem] text-haze">
            Kai pastatysi pagal signalą, paspausk „Pastačiau“, ir statymas atsiras čia su rezultatu.
          </p>
          <Link href="/signalai" className="mt-6 inline-block rounded-xl bg-chalk px-5 py-3 font-semibold text-night hover:bg-white">
            Į signalus
          </Link>
        </div>
      ) : (
        <>
          <BetList title="Laukia rezultato" bets={summary.pending} />
          <BetList title="Užbaigti" bets={summary.settled} />
        </>
      )}
    </main>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-stand p-4 sm:p-5">
      <dt className="text-[0.85rem] text-haze">{label}</dt>
      <dd className="mt-1 font-display text-3xl font-bold tnum">{children}</dd>
    </div>
  )
}

function BetList({ title, bets }: { title: string; bets: ActiveBet[] }) {
  if (bets.length === 0) return null
  return (
    <section className="mt-10">
      <h2 className="text-[1.6rem]">
        {title} <span className="font-sans text-base font-normal text-haze">{bets.length} {ltPlural(bets.length, 'statymas', 'statymai', 'statymų')}</span>
      </h2>
      <ul className="mt-4 divide-y divide-rail overflow-hidden rounded-2xl bg-stand hairline">
        {bets.map((bet) => {
          const status = STATUS[bet.status] ?? STATUS.laukia
          const book = BOOKS.includes(bet.bookmaker as BookName) ? (bet.bookmaker as BookName) : null
          return (
            <li key={bet.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:px-5">
              {book ? <BookMark book={book} /> : <span className="size-8" />}
              <div className="min-w-0">
                <p className="truncate font-medium">{bet.match.replace(' vs ', ' – ')}</p>
                <p className="truncate text-[0.9rem] text-haze">
                  {ltSelection(bet.betDescription)}
                  {bet.startsAt ? `, ${kickoffLabel(bet.startsAt)}` : ''}
                </p>
                <p className="mt-1 text-[0.85rem] text-haze-dim">
                  {formatEuro(bet.stake)} už {formatOdds(bet.odds)}, {bet.bookmaker}
                </p>
              </div>
              <div className="text-right">
                <span className={`inline-block rounded-full px-2.5 py-1 text-[0.8rem] font-medium ${status.tone}`}>{status.label}</span>
                {bet.profit !== null && (
                  <p className={`mt-1 font-semibold ${bet.profit > 0 ? 'text-pitch' : bet.profit < 0 ? 'text-brick' : 'text-haze'}`}>
                    {bet.profit > 0 ? '+' : ''}
                    {formatEuro(bet.profit, 2)}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
