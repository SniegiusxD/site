'use client'

import { Bell, Check, Loader2, Lock, Send } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BOOKS, type BookName } from '@/lib/landing-signals'
import {
  bandFor,
  MARKET_FAMILIES,
  marketLabel,
  ODDS_BANDS,
  PERIODS,
  periodLabel,
  SPORTS,
  sportLabel,
} from '@/lib/signal-taxonomy'
import type { TelegramState } from '@/lib/telegram'
import { TELEGRAM_EDGE_CHOICES, TELEGRAM_HOUR_CHOICES, type TelegramSettings } from '@/lib/telegram-settings'
import { useAccount } from './account-provider'
import { FilterChip, FilterOption } from './filter-chip'

const SAVE_DELAY_MS = 600
const LINK_POLL_MS = 3000
const LINK_POLL_LIMIT = 60
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`

export function TelegramCard() {
  const { account } = useAccount()
  const [state, setState] = useState<TelegramState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)
  const [testing, setTesting] = useState(false)
  const saveTimer = useRef<number | null>(null)

  const load = useCallback(async () => {
    const response = await fetch('/api/telegram', { cache: 'no-store' })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      setError(body?.error ?? 'Nepavyko įkelti Telegram nustatymų.')
      return null
    }
    setState(body)
    return body as TelegramState
  }, [])

  useEffect(() => {
    if (account.access.hasAccess) load()
  }, [load, account.access.hasAccess])

  useEffect(() => () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
  }, [])

  function update(patch: Partial<TelegramSettings>) {
    if (!state) return
    const settings = { ...state.settings, ...patch }
    setState({ ...state, settings })
    setNotice(null)
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      const response = await fetch('/api/telegram', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) setError(body?.error ?? 'Nepavyko išsaugoti.')
      else setError(null)
    }, SAVE_DELAY_MS)
  }

  async function connect() {
    setLinking(true)
    setError(null)
    // Open the window first so the browser doesn't block it as a popup.
    const popup = window.open('', '_blank')
    try {
      const response = await fetch('/api/telegram/link', { method: 'POST' })
      const body = await response.json().catch(() => null)
      if (!response.ok || !body?.url) {
        popup?.close()
        setError(body?.error ?? 'Nepavyko sukurti nuorodos.')
        setLinking(false)
        return
      }
      if (popup) popup.location.href = body.url
      else window.location.href = body.url
      for (let attempt = 0; attempt < LINK_POLL_LIMIT; attempt++) {
        await new Promise((resolve) => window.setTimeout(resolve, LINK_POLL_MS))
        const next = await load()
        if (next?.connected) {
          setNotice('Telegram prijungtas.')
          break
        }
      }
    } finally {
      setLinking(false)
    }
  }

  async function disconnect() {
    const response = await fetch('/api/telegram', { method: 'DELETE' })
    const body = await response.json().catch(() => null)
    if (response.ok) {
      setState(body)
      setNotice('Telegram atjungtas.')
    } else setError(body?.error ?? 'Nepavyko atjungti.')
  }

  async function test() {
    setTesting(true)
    setError(null)
    const response = await fetch('/api/telegram/test', { method: 'POST' })
    const body = await response.json().catch(() => null)
    setTesting(false)
    if (response.ok) setNotice('Išsiųsta. Patikrink Telegram.')
    else setError(body?.error ?? 'Nepavyko išsiųsti.')
  }

  // Alerts carry the whole signal, so the free tier cannot connect one.
  if (!account.access.hasAccess) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="flex max-w-[30rem] items-start gap-3 text-haze">
          <Lock className="mt-1 size-5 shrink-0" aria-hidden />
          Telegram pranešimai ateina su pilna prieiga: kiekvienas naujas signalas su kaina, verte ir suma.
        </p>
        <Link
          href="/atrakinti"
          className="inline-flex h-11 items-center rounded-xl bg-floodlight px-5 font-semibold text-night transition-colors hover:bg-pitch"
        >
          Atrakinti
        </Link>
      </div>
    )
  }

  if (!state) {
    return error ? <p className="text-brick">{error}</p> : <Loader2 className="size-5 animate-spin text-haze" aria-label="Įkeliama" />
  }

  const s = state.settings
  const quietOn = s.quietStart !== null && s.quietEnd !== null
  const band = bandFor(s.minOdds, s.maxOdds)
  const list = (keys: string[], label: (key: string) => string, all: string) =>
    keys.length === 0 ? all : keys.length <= 2 ? keys.map(label).join(', ') : `${keys.length} pasirinkti`
  const sportsValue = list(s.sports, sportLabel, 'visi sportai')
  const marketsValue = list(s.markets, marketLabel, 'visos rinkos')
  const periodsValue = list(s.periods, periodLabel, 'visi periodai')
  const oddsValue = band ? (band.key === 'all' ? 'visi koef.' : `koef. ${band.label}`) : 'koef. pasirinkti'
  const booksValue = s.books.length === BOOKS.length ? 'visos kontoros' : s.books.join(', ')
  // Lithuanian cases make a single flowing sentence read badly here, so the
  // rule is one sentence and the narrowing is a list.
  const clauses = [
    s.sports.length ? `sportas: ${sportsValue.toLowerCase()}` : null,
    s.markets.length ? `rinkos: ${marketsValue.toLowerCase()}` : null,
    s.periods.length ? `periodas: ${periodsValue.toLowerCase()}` : null,
    band && band.key !== 'all' ? `koeficientai ${band.label}` : null,
    s.books.length < BOOKS.length ? `kontoros: ${s.books.join(', ')}` : null,
    `rungtynės prasideda per ${s.maxHoursToStart} val.`,
  ].filter(Boolean)
  const detail = clauses.join(' · ')
  const summary = `Gausi pranešimą, kai atsiras ${Math.round(s.minEdge * 100)} %+ vertė. ${detail.charAt(0).toUpperCase()}${detail.slice(1)}.`
  const toggleKey = (keys: string[], key: string) => (keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key])
  const toggleBook = (book: BookName) => {
    const next = s.books.includes(book) ? s.books.filter((b) => b !== book) : BOOKS.filter((b) => b === book || s.books.includes(b))
    if (next.length) update({ books: next })
  }

  return (
    <div>
      {!state.connected ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex max-w-[30rem] items-start gap-3">
            <Send className="mt-1 size-5 shrink-0 text-haze" aria-hidden />
            <p className="text-haze">
              Nauji signalai pagal tavo nustatymus ateis į Telegram su visais skaičiais ir mygtuku „Sekti statymą“.
              Komanda /statymai parodo tavo rezultatus.
            </p>
          </div>
          <button
            type="button"
            onClick={connect}
            disabled={linking || !state.configured}
            className="inline-flex items-center gap-2 rounded-xl bg-floodlight px-5 py-3 font-semibold text-night transition-transform hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-60"
          >
            {linking && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {linking ? 'Laukiam patvirtinimo Telegram' : 'Prijungti Telegram'}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-night/60 p-4">
          <p className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-pitch-soft text-pitch">
              <Check className="size-3.5" aria-hidden />
            </span>
            Prijungta{state.username ? <span className="font-medium"> @{state.username}</span> : null}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={test} disabled={testing} className="rounded-lg bg-rail px-3 py-2 text-[0.95rem] font-medium hover:bg-rail-strong disabled:opacity-60">
              {testing ? 'Siunčiama…' : 'Bandomasis pranešimas'}
            </button>
            <button type="button" onClick={disconnect} className="rounded-lg px-3 py-2 text-[0.95rem] font-medium text-brick hover:bg-brick-soft">
              Atjungti
            </button>
          </div>
        </div>
      )}

      {notice && <p className="mt-4 text-pitch" role="status">{notice}</p>}
      {error && <p className="mt-4 rounded-xl bg-brick-soft px-4 py-3 text-brick" role="alert">{error}</p>}

      <div className="mt-6 space-y-6">
        <label className="flex items-center justify-between gap-4">
          <span className="font-medium">Siųsti signalus</span>
          <input
            type="checkbox"
            checked={s.enabled}
            onChange={(event) => update({ enabled: event.target.checked })}
            className="size-5 accent-[var(--pitch)]"
          />
        </label>
        <div>
          <p className="text-[0.75rem] tracking-[0.06em] text-haze-dim uppercase">Ką siųsti</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <FilterChip label="Sportas" value={sportsValue} active={s.sports.length > 0}>
              <FilterOption label="Visi sportai" checked={s.sports.length === 0} onChange={() => update({ sports: [] })} />
              {SPORTS.map((sport) => (
                <FilterOption
                  key={sport.key}
                  label={sport.label}
                  multiple
                  checked={s.sports.includes(sport.key)}
                  onChange={() => update({ sports: toggleKey(s.sports, sport.key) })}
                />
              ))}
            </FilterChip>

            <FilterChip label="Laikas iki rungtynių" value={`per ${s.maxHoursToStart} val.`} active>
              {TELEGRAM_HOUR_CHOICES.map((hours) => (
                <FilterOption
                  key={hours}
                  label={`per ${hours} val.`}
                  checked={s.maxHoursToStart === hours}
                  onChange={() => update({ maxHoursToStart: hours })}
                />
              ))}
            </FilterChip>

            <FilterChip label="Vertė" value={`vertė ${Math.round(s.minEdge * 100)} %+`} active>
              {TELEGRAM_EDGE_CHOICES.map((edge) => (
                <FilterOption
                  key={edge}
                  label={`${Math.round(edge * 100)} %+`}
                  checked={Math.abs(s.minEdge - edge) < 0.0001}
                  onChange={() => update({ minEdge: edge })}
                />
              ))}
            </FilterChip>

            <FilterChip label="Koeficientai" value={oddsValue} active={band?.key !== 'all'}>
              {ODDS_BANDS.map((option) => (
                <FilterOption
                  key={option.key}
                  label={option.label}
                  checked={band?.key === option.key}
                  onChange={() => update({ minOdds: option.min, maxOdds: option.max })}
                />
              ))}
            </FilterChip>

            <FilterChip label="Rinka" value={marketsValue} active={s.markets.length > 0}>
              <FilterOption label="Visos rinkos" checked={s.markets.length === 0} onChange={() => update({ markets: [] })} />
              {MARKET_FAMILIES.map((family) => (
                <FilterOption
                  key={family.key}
                  label={family.label}
                  multiple
                  checked={s.markets.includes(family.key)}
                  onChange={() => update({ markets: toggleKey(s.markets, family.key) })}
                />
              ))}
            </FilterChip>

            <FilterChip label="Periodas" value={periodsValue} active={s.periods.length > 0}>
              <FilterOption label="Visi periodai" checked={s.periods.length === 0} onChange={() => update({ periods: [] })} />
              {PERIODS.map((period) => (
                <FilterOption
                  key={period.key}
                  label={period.label}
                  multiple
                  checked={s.periods.includes(period.key)}
                  onChange={() => update({ periods: toggleKey(s.periods, period.key) })}
                />
              ))}
            </FilterChip>

            <FilterChip label="Kontoros" value={booksValue} active={s.books.length < BOOKS.length}>
              {BOOKS.map((book) => (
                <FilterOption key={book} label={book} multiple checked={s.books.includes(book)} onChange={() => toggleBook(book)} />
              ))}
            </FilterChip>
          </div>

          <p className="mt-4 flex gap-2.5 rounded-xl bg-floodlight-soft px-3.5 py-3 text-[0.9rem] text-chalk">
            <Bell className="mt-0.5 size-4 shrink-0 text-floodlight" aria-hidden />
            <span>{summary}</span>
          </p>
        </div>

        <fieldset>
          <legend className="flex w-full items-center justify-between gap-4 font-medium">
            Tylos valandos
            <input
              type="checkbox"
              checked={quietOn}
              onChange={(event) => update(event.target.checked ? { quietStart: 0, quietEnd: 8 } : { quietStart: null, quietEnd: null })}
              className="size-5 accent-[var(--pitch)]"
              aria-label="Tylos valandos"
            />
          </legend>
          {quietOn && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-haze">
              <span>Nuo</span>
              <select
                value={s.quietStart ?? 0}
                onChange={(event) => update({ quietStart: Number(event.target.value) })}
                className="h-10 rounded-lg bg-night/60 px-3 text-chalk hairline"
                aria-label="Tylos pradžia"
              >
                {HOURS.map((hour) => <option key={hour} value={hour}>{hourLabel(hour)}</option>)}
              </select>
              <span>iki</span>
              <select
                value={s.quietEnd ?? 8}
                onChange={(event) => update({ quietEnd: Number(event.target.value) })}
                className="h-10 rounded-lg bg-night/60 px-3 text-chalk hairline"
                aria-label="Tylos pabaiga"
              >
                {HOURS.map((hour) => <option key={hour} value={hour}>{hourLabel(hour)}</option>)}
              </select>
              <span>Vilniaus laiku</span>
            </div>
          )}
        </fieldset>
      </div>
    </div>
  )
}
