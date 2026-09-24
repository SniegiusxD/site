'use client'

import { Lock, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { formatEdge } from '@/lib/format-lt'
import { FREE_MAX_EDGE } from '@/lib/free-tier'
import { BOOKS, type BookName } from '@/lib/landing-signals'
import { bandFor, MARKET_FAMILIES, marketLabel, ODDS_BANDS, PERIODS, periodLabel } from '@/lib/signal-taxonomy'
import { sportName } from '@/lib/sports-lt'
import { useAccount } from '../account-provider'
import { FilterChip, FilterOption } from '../filter-chip'
import { type SavedView, SORTS, useBoardView, useSavedViews } from './use-board-preferences'

/**
 * The board's filter chips. Each reads the stored view and the account
 * settings itself (the same store as the board, so both stay in step) rather
 * than taking a dozen props.
 */

const EDGE_CHOICES = [0.01, 0.02, 0.03, 0.05]
const HOUR_CHOICES = [
  { value: 6, label: '6 val.' },
  { value: 24, label: '24 val.' },
  { value: 48, label: '2 d.' },
  { value: 168, label: '7 d.' },
]

/** What each choice would leave, with every other filter still applied. */
export type FilterCounts = {
  sports: Record<string, number>
  markets: Record<string, number>
  periods: Record<string, number>
  books: Record<string, number>
}

const listLabel = (keys: string[], label: (key: string) => string, all: string) =>
  keys.length === 0 ? all : keys.length <= 2 ? keys.map(label).join(', ') : `${keys.length} pasirinkti`

/** A board the member named: saving the current one, applying or removing a saved one. */
export function SavedViewsChip() {
  const { account, updateSettings } = useAccount()
  const prefs = account.preferences
  const { sort, drift, sports: sportsPicked, markets, periods, setSort, setDrift, setSportsPicked, setMarkets, setPeriods } = useBoardView()
  const [savedViews, writeViews] = useSavedViews()
  return (
    <FilterChip label="Išsaugoti vaizdai" value={savedViews.length ? `Vaizdai ${savedViews.length}` : 'Vaizdai'} active={false}>
      {savedViews.length === 0 && (
        <p className="px-2.5 pb-2 text-[0.85rem] text-haze">
          Susidėliok filtrus ir išsaugok — grįžęs rasi tokį patį sąrašą.
        </p>
      )}
      {savedViews.map((view) => (
        <div key={view.name} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setSort(view.sort)
              setDrift(view.drift)
              setSportsPicked(view.sports)
              setMarkets(view.markets)
              setPeriods(view.periods)
              updateSettings({ minEdge: view.minEdge, books: view.books })
            }}
            className="min-h-11 flex-1 truncate rounded-xl px-2.5 text-left text-[0.9rem] text-chalk hover:bg-stand-hover"
          >
            {view.name}
          </button>
          <button
            type="button"
            aria-label={`Pašalinti vaizdą ${view.name}`}
            onClick={() => writeViews(savedViews.filter((saved) => saved.name !== view.name))}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-haze-dim hover:bg-rail hover:text-chalk"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const name = window.prompt('Vaizdo pavadinimas', 'Krepšinis 3 %+')?.trim()
          if (!name) return
          const view: SavedView = {
            name: name.slice(0, 40),
            sort,
            drift,
            sports: sportsPicked,
            markets,
            periods,
            minEdge: prefs.minEdge,
            books: prefs.books,
          }
          writeViews([...savedViews.filter((saved) => saved.name !== view.name), view].slice(-8))
        }}
        className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-xl bg-stand-hover px-2.5 text-[0.9rem] font-medium text-chalk"
      >
        <Plus className="size-4" aria-hidden />
        Išsaugoti dabartinį
      </button>
    </FilterChip>
  )
}

/** Price movement is part of the full board; a sort remembered from a trial falls back to value. */
export function SortChip({ freeTier }: { freeTier: boolean }) {
  const { sort, setSort } = useBoardView()
  const activeSort = freeTier && sort === 'moving' ? 'value' : sort
  return (
    <FilterChip label="Rikiuoti" value={SORTS.find((option) => option.key === activeSort)!.label} active={activeSort !== 'value'}>
      {SORTS.filter((option) => !(freeTier && option.key === 'moving')).map((option) => (
        <FilterOption
          key={option.key}
          label={option.label}
          checked={activeSort === option.key}
          onChange={() => setSort(option.key)}
        />
      ))}
    </FilterChip>
  )
}

/** Always visible, the way a member actually works: narrow, look, widen. */
export function FilterChips({ freeTier, counts, onBoard }: { freeTier: boolean; counts: FilterCounts; onBoard: string[] }) {
  const { account, updateSettings } = useAccount()
  const prefs = account.preferences
  const { drift, sports: sportsPicked, markets, periods, setDrift, setSportsPicked, setMarkets, setPeriods } = useBoardView()
  const activeDrift = freeTier ? 'all' : drift

  function toggleBook(book: BookName) {
    const next = prefs.books.includes(book) ? prefs.books.filter((b) => b !== book) : BOOKS.filter((b) => b === book || prefs.books.includes(b))
    if (next.length === 0) return
    updateSettings({ books: next })
  }

  const band = bandFor(prefs.minOdds, prefs.maxOdds) ?? bandFor(prefs.minOdds, 100)
  const booksValue = prefs.books.length === BOOKS.length ? 'visos kontoros' : prefs.books.join(', ')
  const sportsValue = listLabel(sportsPicked, sportName, 'visi sportai')
  const marketsValue = listLabel(markets, marketLabel, 'visos rinkos')
  const periodsValue = listLabel(periods, periodLabel, 'visi periodai')

  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      <FilterChip label="Kontoros" value={prefs.books.length < BOOKS.length ? booksValue : 'Kontoros'} active={prefs.books.length < BOOKS.length}>
        {BOOKS.map((book) => (
          <FilterOption
            key={book}
            label={book}
            multiple
            count={counts.books[book]}
            checked={prefs.books.includes(book)}
            onChange={() => toggleBook(book)}
          />
        ))}
      </FilterChip>

      <FilterChip label="Sportas" value={sportsPicked.length ? sportsValue : 'Sportas'} active={sportsPicked.length > 0}>
        <FilterOption
          label="Visi sportai"
          checked={sportsPicked.length === 0}
          onChange={() => {
            setSportsPicked([])
          }}
        />
        {onBoard.map((key) => (
          <FilterOption
            key={key}
            label={sportName(key)}
            multiple
            count={counts.sports[key]}
            checked={sportsPicked.includes(key)}
            onChange={() => {
              setSportsPicked((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))
            }}
          />
        ))}
      </FilterChip>

      <FilterChip label="Laikas iki rungtynių" value={`${prefs.maxHoursToStart} val.`} active>
        {HOUR_CHOICES.map((choice) => (
          <FilterOption
            key={choice.value}
            label={`per ${choice.label}`}
            checked={prefs.maxHoursToStart === choice.value}
            onChange={() => updateSettings({ maxHoursToStart: choice.value })}
          />
        ))}
      </FilterChip>

      {freeTier ? (
        <span className="inline-flex min-h-11 items-center rounded-full px-4 text-[0.9rem] text-haze hairline">
          vertė iki {formatEdge(FREE_MAX_EDGE)}
        </span>
      ) : (
        <FilterChip label="Vertė" value={`${Math.round(prefs.minEdge * 100)} %+`} active>
          {EDGE_CHOICES.map((value) => (
            <FilterOption
              key={value}
              label={`${Math.round(value * 100)} %+`}
              checked={Math.abs(prefs.minEdge - value) < 0.0001}
              onChange={() => updateSettings({ minEdge: value })}
            />
          ))}
        </FilterChip>
      )}

      <FilterChip label="Koeficientai" value={band && band.key !== 'all' ? band.label : 'Koef.'} active={band?.key !== 'all'}>
        {ODDS_BANDS.map((option) => (
          <FilterOption
            key={option.key}
            label={option.label}
            checked={band?.key === option.key}
            onChange={() => updateSettings({ minOdds: option.min, maxOdds: option.key === 'all' ? 6 : option.max })}
          />
        ))}
      </FilterChip>

      <FilterChip label="Rinka" value={markets.length ? marketsValue : 'Rinka'} active={markets.length > 0}>
        <FilterOption label="Visos rinkos" checked={markets.length === 0} onChange={() => setMarkets([])} />
        {MARKET_FAMILIES.map((family) => (
          <FilterOption
            key={family.key}
            label={family.label}
            multiple
            count={counts.markets[family.key]}
            checked={markets.includes(family.key)}
            onChange={() =>
              setMarkets((current) => (current.includes(family.key) ? current.filter((item) => item !== family.key) : [...current, family.key]))
            }
          />
        ))}
      </FilterChip>

      <FilterChip
        label="Kainos judėjimas"
        value={activeDrift === 'all' ? 'Judėjimas' : activeDrift === 'down' ? 'Krenta' : 'Kyla'}
        active={activeDrift !== 'all'}
      >
        {freeTier ? (
          // What the tool does, without a single real event, book or price.
          <div className="max-w-[18rem] p-2">
            <p className="flex items-center gap-2 font-medium">
              <Lock className="size-4 text-haze" aria-hidden />
              Pilnos prieigos įrankis
            </p>
            <p className="mt-1.5 text-[0.9rem] text-haze">
              Rodo, kurių signalų kaina krenta ar kyla tarp skenavimų: krentanti kaina dažnai reiškia, kad vertė netrukus užsidarys.
            </p>
            <Link href="/atrakinti" className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-floodlight px-3 text-[0.9rem] font-semibold text-night">
              Atrakinti
            </Link>
          </div>
        ) : (
          <>
            <FilterOption label="Visos" checked={drift === 'all'} onChange={() => setDrift('all')} />
            <FilterOption label="Kaina krenta" checked={drift === 'down'} onChange={() => setDrift('down')} />
            <FilterOption label="Kaina kyla" checked={drift === 'up'} onChange={() => setDrift('up')} />
          </>
        )}
      </FilterChip>

      <FilterChip label="Periodas" value={periods.length ? periodsValue : 'Periodas'} active={periods.length > 0}>
        <FilterOption label="Visi periodai" checked={periods.length === 0} onChange={() => setPeriods([])} />
        {PERIODS.map((period) => (
          <FilterOption
            key={period.key}
            label={period.label}
            multiple
            count={counts.periods[period.key]}
            checked={periods.includes(period.key)}
            onChange={() =>
              setPeriods((current) => (current.includes(period.key) ? current.filter((item) => item !== period.key) : [...current, period.key]))
            }
          />
        ))}
      </FilterChip>
    </div>
  )
}
