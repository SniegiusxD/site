'use client'

import NumberFlow from '@number-flow/react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Trophy } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { Period } from '@/lib/bet-value'
import { formatEdge, ltPlural } from '@/lib/format-lt'
import { MIN_BETS_FOR_RATE, type TopEntry, type TopProfile, type TopSort, shiftMonth, vilniusMonth } from '@/lib/top'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { Segmented } from './segmented'
import { signedEuro } from './value-chart'

type Entry = Omit<TopEntry, 'userId'>
type Board = {
  period: Period
  sort: TopSort
  month: string
  profile: TopProfile
  ranked: Entry[]
  tooFew: Entry[]
  you: (Entry & { wouldBe: number | null }) | null
}

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 'week', label: 'Savaitė' },
  { value: 'month', label: 'Mėnuo' },
  { value: 'all', label: 'Viskas' },
]

const SORTS: Array<{ value: TopSort; label: string }> = [
  { value: 'profit', label: 'Pelnas' },
  { value: 'roi', label: 'Grąža' },
  { value: 'clv', label: 'CLV' },
]

const MONTHS = ['Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis', 'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis']

const EASE = [0.22, 1, 0.36, 1] as const
const EURO_FLOW = { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' } as const
const PERCENT_FLOW = { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' } as const

const monthLabel = (month: string) => {
  const [year, number] = month.split('-').map(Number)
  return `${MONTHS[number - 1]} ${year}`
}

const metricValue = (entry: Entry, sort: TopSort) => (sort === 'profit' ? entry.profit : sort === 'roi' ? entry.roi : entry.clv)

function metricText(entry: Entry, sort: TopSort): string {
  const value = metricValue(entry, sort)
  if (value === null) return '–'
  return sort === 'profit' ? signedEuro(value) : formatEdge(value)
}

const tone = (value: number | null) => (value === null || Math.abs(value) < 1e-9 ? '' : value > 0 ? 'text-pitch' : 'text-brick')

const recordText = (entry: Entry) =>
  `${entry.bets} ${ltPlural(entry.bets, 'statymas', 'statymai', 'statymų')}, ${entry.won}–${entry.lost}–${entry.pushed}`

function secondaryText(entry: Entry, sort: TopSort): string {
  if (sort === 'profit') return entry.roi === null ? '' : `grąža ${formatEdge(entry.roi)}`
  if (sort === 'roi') return signedEuro(entry.profit)
  return `${entry.clvBets} su uždarymo kaina`
}

export function TopView() {
  const [period, setPeriod] = useState<Period>('month')
  const [sort, setSort] = useState<TopSort>('profit')
  const [month, setMonth] = useState<string | null>(null)
  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const latest = useRef(0)

  const load = useCallback(async () => {
    const request = ++latest.current
    setLoading(true)
    try {
      const params = new URLSearchParams({ period, sort })
      if (period === 'month' && month) params.set('month', month)
      const response = await fetch(`/api/top?${params}`, { cache: 'no-store' })
      const body = await response.json().catch(() => null)
      if (!response.ok || !body) throw new Error(body?.error ?? '')
      if (request === latest.current) {
        setBoard(body)
        setError(null)
      }
    } catch (caught) {
      if (request === latest.current) {
        setError(caught instanceof Error && caught.message ? caught.message : 'Nepavyko įkelti topo. Bandyk dar kartą.')
      }
    } finally {
      if (request === latest.current) setLoading(false)
    }
  }, [period, sort, month])

  useEffect(() => {
    load()
  }, [load])

  async function saveProfile(next: TopProfile): Promise<string | null> {
    try {
      const response = await fetch('/api/top/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) return body?.error ?? 'Nepavyko išsaugoti. Bandyk dar kartą.'
      toast.success(next.optIn ? `Tope tave matys kaip ${body.profile.name}` : 'Tavęs tope nebėra')
      await load()
      return null
    } catch {
      return 'Nepavyko pasiekti serverio.'
    }
  }

  return (
    <main className="mx-auto max-w-[60rem] px-4 pt-6 pb-16 sm:px-8 lg:pt-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[2.4rem] sm:text-[3rem]">Topas</h1>
        <button
          type="button"
          onClick={load}
          aria-label="Atnaujinti"
          className="grid size-10 place-items-center rounded-xl text-haze transition-colors hover:bg-stand hover:text-chalk"
        >
          <RefreshCw className={`size-5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
        </button>
      </div>
      <p className="mt-2 max-w-[40rem] text-haze">
        Narių rezultatai iš jų pačių pažymėtų statymų. Rodomi tik tie, kurie patys įsijungė.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Segmented label="Laikotarpis" options={PERIODS} value={period} onChange={setPeriod} />
        <Segmented label="Rikiuoti pagal" options={SORTS} value={sort} onChange={setSort} />
      </div>
      {period === 'month' && board && <MonthNav month={month ?? board.month} onChange={setMonth} />}

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-brick-soft px-4 py-3 text-brick">
          {error}
        </p>
      )}

      {board === null ? (
        !error && (
          <div className="grid place-items-center py-24 text-haze">
            <Loader2 className="size-6 animate-spin" aria-hidden />
          </div>
        )
      ) : (
        <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <JoinCard key={`${board.profile.optIn}-${board.profile.name}`} profile={board.profile} onSave={saveProfile} />
          {board.you && <PrivateLine you={board.you} sort={board.sort} />}
          <Ranking board={board} />
          {board.tooFew.length > 0 && <TooFew board={board} />}
        </div>
      )}

      <p className="mt-10 max-w-[44rem] text-[0.9rem] text-haze">
        Pelnas eurais priklauso nuo sumų ir nuo sėkmės. Grąža palygina narius nepriklausomai nuo sumų. CLV rodo, ar kainos buvo
        geresnės už uždarymo kainą: po kelių šimtų statymų tai geriausias ženklas, kad statoma teisingai.
      </p>
    </main>
  )
}

function MonthNav({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const atCurrent = month >= vilniusMonth(new Date())
  return (
    <div className="mt-3 flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Ankstesnis mėnuo"
        className="grid size-10 place-items-center rounded-xl text-haze transition-colors hover:bg-stand hover:text-chalk"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <p aria-live="polite" className="min-w-[10rem] text-center font-display text-[1.6rem] leading-none font-bold">
        {monthLabel(month)}
      </p>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={atCurrent}
        aria-label="Kitas mėnuo"
        className="grid size-10 place-items-center rounded-xl text-haze transition-colors hover:bg-stand hover:text-chalk disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </div>
  )
}

function JoinCard({ profile, onSave }: { profile: TopProfile; onSave: (next: TopProfile) => Promise<string | null> }) {
  const inputId = useId()
  const titleId = useId()
  const [name, setName] = useState(profile.name ?? '')
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(next: TopProfile) {
    setPending(true)
    setError(null)
    const problem = await onSave(next)
    setPending(false)
    if (problem) setError(problem)
  }

  if (profile.optIn && !editing) {
    return (
      <section aria-label="Tavo vieta tope" className="mt-6 rounded-2xl bg-stand p-4 hairline sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-haze">
            Tope tave mato kaip <span className="font-semibold text-chalk">{profile.name}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-xl bg-rail px-3.5 py-2 font-medium transition-colors hover:bg-rail-strong"
            >
              Keisti vardą
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => submit({ optIn: false, name: profile.name })}
              className="rounded-xl px-3.5 py-2 font-medium text-haze transition-colors hover:bg-rail hover:text-chalk disabled:opacity-70"
            >
              Išeiti iš topo
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-brick-soft px-4 py-3 text-brick">
            {error}
          </p>
        )}
      </section>
    )
  }

  return (
    <section aria-labelledby={titleId} className="mt-6 rounded-2xl bg-stand p-5 hairline sm:p-6">
      <h2 id={titleId} className="text-[1.6rem]">
        {profile.optIn ? 'Keisti vardą tope' : 'Būk tope'}
      </h2>
      <p className="mt-1 max-w-[36rem] text-[0.95rem] text-haze">
        Kiti nariai matys tik šį vardą ir tavo statymų rezultatus. El. pašto nerodome. Išeiti gali bet kada.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit({ optIn: true, name })
        }}
        className="mt-4 flex flex-wrap items-end gap-2"
      >
        <div className="min-w-0 flex-1 basis-[14rem]">
          <label htmlFor={inputId} className="block text-[0.9rem] text-haze">
            Vardas tope
          </label>
          <input
            id={inputId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={20}
            autoComplete="nickname"
            className="mt-1.5 h-12 w-full rounded-xl bg-night/60 px-4 font-semibold outline-none hairline focus:shadow-[inset_0_0_0_1.5px_var(--chalk)]"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-chalk px-5 font-semibold text-night transition-transform hover:bg-white active:scale-[0.98] disabled:opacity-70"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {profile.optIn ? 'Išsaugoti' : 'Rodyti mane tope'}
        </button>
        {profile.optIn && (
          <button
            type="button"
            onClick={() => {
              setEditing(false)
              setName(profile.name ?? '')
              setError(null)
            }}
            className="h-12 rounded-xl px-4 font-medium text-haze transition-colors hover:text-chalk"
          >
            Atšaukti
          </button>
        )}
      </form>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-brick-soft px-4 py-3 text-brick">
          {error}
        </p>
      )}
    </section>
  )
}

function PrivateLine({ you, sort }: { you: NonNullable<Board['you']>; sort: TopSort }) {
  const note = you.wouldBe
    ? `Būtum ${you.wouldBe} vietoje.`
    : sort === 'clv'
      ? `CLV topui reikia bent ${MIN_BETS_FOR_RATE} statymų su uždarymo kaina.`
      : `Grąžos topui reikia bent ${MIN_BETS_FOR_RATE} užbaigtų statymų.`
  return (
    <section
      aria-label="Tavo rezultatas"
      className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-rail-strong p-4 sm:px-6"
    >
      <div>
        <p className="font-medium">
          Tavo rezultatas <span className="text-haze">(matai tik tu)</span>
        </p>
        <p className="mt-0.5 text-[0.9rem] text-haze">
          {recordText(you)}. {note}
        </p>
      </div>
      <p className={`font-display text-[1.8rem] leading-none font-bold tnum ${tone(metricValue(you, sort))}`}>{metricText(you, sort)}</p>
    </section>
  )
}

function Ranking({ board }: { board: Board }) {
  const reduced = useReducedMotion()
  const { sort } = board
  const [leader, ...rest] = board.ranked

  if (!leader) {
    return (
      <div className="mt-6 rounded-2xl bg-stand p-8 text-center hairline">
        <Trophy className="mx-auto size-8 text-haze" aria-hidden />
        <p className="mt-3 font-display text-3xl font-bold">Šiuo laikotarpiu tope tuščia</p>
        <p className="mx-auto mt-2 max-w-[28rem] text-haze">
          {sort === 'profit'
            ? 'Kai įsijungę nariai turės užbaigtų statymų, jie atsiras čia.'
            : sort === 'roi'
              ? `Grąžos topui reikia bent ${MIN_BETS_FOR_RATE} užbaigtų statymų.`
              : `CLV topui reikia bent ${MIN_BETS_FOR_RATE} statymų su uždarymo kaina.`}
        </p>
      </div>
    )
  }

  const leaderValue = metricValue(leader, sort)
  return (
    <>
      <section aria-label="Pirma vieta" className="mt-6 overflow-hidden rounded-2xl bg-stand p-5 hairline sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[0.95rem] text-haze">
              <Trophy className="size-4 text-chalk" aria-hidden />1 vieta
            </p>
            <div className="mt-2 flex min-w-0 items-center gap-2">
              <p className="truncate font-display text-[2.6rem] leading-none font-extrabold sm:text-[3.2rem]">{leader.name}</p>
              {leader.isYou && <YouBadge />}
            </div>
            <p className="mt-2 text-haze">{recordText(leader)}</p>
          </div>
          <p className={`font-display text-[2.6rem] leading-none font-bold tnum sm:text-[3.2rem] ${tone(leaderValue)}`}>
            {leaderValue === null ? (
              '–'
            ) : sort === 'profit' ? (
              <NumberFlow value={leaderValue} locales="lt-LT" format={EURO_FLOW} suffix=" €" />
            ) : (
              <NumberFlow value={leaderValue} locales="lt-LT" format={PERCENT_FLOW} />
            )}
          </p>
        </div>
        {leader.series && leader.series.length > 2 && <Sparkline values={leader.series} />}
        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-rail pt-4">
          <LeaderStat label="Pelnas" value={signedEuro(leader.profit)} className={tone(leader.profit)} />
          <LeaderStat label="Grąža" value={leader.roi === null ? '–' : formatEdge(leader.roi)} className={tone(leader.roi)} />
          <LeaderStat label="CLV" value={leader.clv === null ? '–' : formatEdge(leader.clv)} className={tone(leader.clv)} />
        </dl>
      </section>

      {rest.length > 0 && (
        <ol aria-label="Kitos vietos" className="mt-3 divide-y divide-rail overflow-hidden rounded-2xl bg-stand hairline">
          {rest.map((entry) => (
            <motion.li
              key={entry.name}
              layout={reduced ? false : 'position'}
              transition={{ duration: 0.3, ease: EASE }}
              className={`grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 sm:px-5 ${entry.isYou ? 'bg-rail/50' : ''}`}
            >
              <span className="font-display text-[1.6rem] leading-none font-bold text-haze tnum">{entry.rank}</span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate font-medium">{entry.name}</p>
                  {entry.isYou && <YouBadge />}
                </div>
                <p className="text-[0.85rem] text-haze-dim">{recordText(entry)}</p>
              </div>
              <div className="text-right">
                <p className={`font-semibold tnum ${tone(metricValue(entry, sort))}`}>{metricText(entry, sort)}</p>
                <p className="text-[0.85rem] text-haze-dim">{secondaryText(entry, sort)}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      )}
    </>
  )
}

function TooFew({ board }: { board: Board }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="mt-8">
      <h2 id={titleId} className="text-[1.4rem]">
        Dar per mažai statymų
      </h2>
      <p className="mt-1 text-[0.95rem] text-haze">
        {board.sort === 'clv'
          ? `CLV topui reikia bent ${MIN_BETS_FOR_RATE} statymų su uždarymo kaina.`
          : `Grąžos topui reikia bent ${MIN_BETS_FOR_RATE} užbaigtų statymų.`}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {board.tooFew.map((entry) => (
          <li key={entry.name} className="rounded-full bg-stand px-3.5 py-1.5 text-[0.9rem] hairline">
            {entry.name} <span className="text-haze">{board.sort === 'clv' ? entry.clvBets : entry.bets} iš {MIN_BETS_FOR_RATE}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function LeaderStat({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.85rem] text-haze">{label}</dt>
      <dd className={`mt-1 truncate font-semibold tnum ${className}`}>{value}</dd>
    </div>
  )
}

function YouBadge() {
  return <span className="shrink-0 rounded-full bg-chalk px-2 py-0.5 text-[0.75rem] leading-none font-semibold text-night">Tu</span>
}

/** The leader's running profit through the period. */
function Sparkline({ values }: { values: number[] }) {
  const width = 600
  const height = 72
  const low = Math.min(0, ...values)
  const high = Math.max(0, ...values)
  const span = high - low || 1
  const x = (index: number) => (index / (values.length - 1)) * width
  const y = (value: number) => height - 4 - ((value - low) / span) * (height - 8)
  const path = values.map((value, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)} ${y(value).toFixed(1)}`).join(' ')
  const up = values[values.length - 1] >= 0
  // The numbers are in the stats below; this is the shape of the period.
  return (
    <div aria-hidden className="mt-5">
      <p className="text-[0.85rem] text-haze">Pelno eiga</p>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="mt-2 h-[72px] w-full">
        <line x1="0" x2={width} y1={y(0)} y2={y(0)} stroke="var(--rail-strong)" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
        <path
          d={path}
          fill="none"
          stroke={up ? 'var(--pitch)' : 'var(--brick)'}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}
