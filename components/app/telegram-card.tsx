'use client'

import { motion } from 'framer-motion'
import { Bell, Check, Loader2, Lock, Send, X } from 'lucide-react'
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
import { clockLabel } from '@/lib/live-view'
import { ApiError, fetchJson, useApi } from '@/lib/use-api'
import { useAccount } from './account-provider'
import { FilterChip, FilterOption } from './filter-chip'
import { LoadError } from './load-error'
import { SPRING } from '@/lib/motion'
import { useReducedMotion } from '@/lib/use-reduced-motion'

const SAVE_DELAY_MS = 600
const LINK_POLL_MS = 3000
const LINK_POLL_LIMIT = 60
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`

/** How long the member can silence alerts for. */
const PAUSES = [
  { value: 'hour', label: '1 valandai', done: 'Tyla valandai.' },
  { value: 'tomorrow', label: 'Iki rytojaus', done: 'Tyla iki ryto.' },
  { value: 'forever', label: 'Kol įjungsiu', done: 'Pranešimai sustabdyti.' },
]

export function TelegramCard() {
  const { account } = useAccount()
  // Loaded once for members with access; every change here answers with the
  // new state, which then replaces it.
  const loaded = useApi<TelegramState>(account.access.hasAccess ? '/api/telegram' : null)
  const [changed, setState] = useState<TelegramState | null>(null)
  const state = changed ?? loaded.data
  const [commandError, setError] = useState<string | null>(null)
  const error = commandError ?? (loaded.error ? (loaded.error.serverMessage ?? 'Nepavyko įkelti Telegram nustatymų.') : null)
  const [notice, setNotice] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)
  const [testing, setTesting] = useState(false)
  const [presetName, setPresetName] = useState('')
  const saveTimer = useRef<number | null>(null)
  const reduced = useReducedMotion()
  // Set when the link succeeds on this page: a paper plane crosses the card once.
  const [justLinked, setJustLinked] = useState(0)

  // While linking: ask again until Telegram reports the chat connected.
  const load = useCallback(async () => {
    try {
      const body = await fetchJson<TelegramState>('/api/telegram')
      setState(body)
      return body
    } catch (caught) {
      setError(caught instanceof ApiError ? (caught.serverMessage ?? 'Nepavyko įkelti Telegram nustatymų.') : 'Nepavyko įkelti Telegram nustatymų.')
      return null
    }
  }, [])

  useEffect(() => () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
  }, [])

  async function setNotifySettled(on: boolean) {
    if (!state) return
    const before = state
    setState({ ...state, notifySettled: on })
    try {
      const response = await fetch('/api/telegram/settled', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ on }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error ?? 'Nepavyko išsaugoti.')
      setState(body)
      setError(null)
    } catch (caught) {
      setState(before)
      // fetch() throws TypeError when offline; its English text is not for members.
      setError(caught instanceof TypeError ? 'Nepavyko susisiekti su serveriu.' : caught instanceof Error ? caught.message : 'Nepavyko išsaugoti.')
    }
  }

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

  /** Pause, resume, save a preset or apply one: each answers with the new state. */
  async function command(path: string, init: RequestInit, message?: string) {
    setError(null)
    const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...init })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      setError(body?.error ?? 'Nepavyko.')
      return
    }
    setState(body)
    setNotice(message ?? null)
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
          setJustLinked((value) => value + 1)
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
    if (loaded.error && !loaded.loading) {
      return <LoadError error={loaded.error} what="Telegram nustatymų" onRetry={loaded.reload} />
    }
    if (commandError) return <p className="text-brick">{commandError}</p>
    return (
      <p role="status" className="flex items-center gap-2 text-haze">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        <span className="sr-only">Įkeliami Telegram nustatymai…</span>
      </p>
    )
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
        <div className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-xl bg-night/60 p-4">
          {justLinked > 0 && !reduced && (
            <motion.span
              key={justLinked}
              aria-hidden
              className="pointer-events-none absolute bottom-2 left-2 text-floodlight"
              initial={{ x: 0, y: 0, rotate: -8, opacity: 0 }}
              animate={{ x: ['0%', '500%', '1800%'], y: [0, -14, -48], rotate: [-8, 4, 12], opacity: [0, 1, 0] }}
              transition={{ duration: 1.1, ease: [0.45, 0, 0.2, 1], times: [0, 0.35, 1] }}
            >
              <Send className="size-6" aria-hidden />
            </motion.span>
          )}
          <p className="relative flex items-center gap-2">
            <motion.span
              key={justLinked}
              initial={justLinked && !reduced ? { scale: 0.3 } : false}
              animate={{ scale: 1 }}
              transition={{ ...SPRING.snappy, delay: 0.5 }}
              className="grid size-6 place-items-center rounded-full bg-pitch-soft text-pitch"
            >
              <Check className="size-3.5" aria-hidden />
            </motion.span>
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

        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block font-medium">Pranešti, kai statymas atsiskaito</span>
            <span className="mt-0.5 block text-[0.9rem] text-haze">Rezultatas ir CLV, o pirmadieniais savaitės suvestinė.</span>
          </span>
          <input
            type="checkbox"
            checked={state.notifySettled}
            onChange={(event) => setNotifySettled(event.target.checked)}
            className="size-5 shrink-0 accent-[var(--pitch)]"
          />
        </label>

        {/* A pause with an end, so switching alerts off during a match does not
            quietly switch them off for a week. */}
        <div>
          <p className="text-[0.75rem] tracking-[0.06em] text-haze-dim uppercase">Pristabdyti</p>
          {state.pausedUntil ? (
            <p className="mt-2 flex flex-wrap items-center gap-3 text-[0.95rem] text-haze">
              Tyla iki {clockLabel(state.pausedUntil)}.
              <button
                type="button"
                onClick={() => command('/api/telegram/pause', { method: 'POST', body: JSON.stringify({ until: 'resume' }) }, 'Pranešimai vėl įjungti.')}
                className="min-h-11 rounded-lg bg-rail px-3 font-medium hover:bg-rail-strong"
              >
                Įjungti dabar
              </button>
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {PAUSES.map((pause) => (
                <button
                  key={pause.value}
                  type="button"
                  onClick={() => command('/api/telegram/pause', { method: 'POST', body: JSON.stringify({ until: pause.value }) }, pause.done)}
                  className="min-h-11 rounded-lg bg-stand px-3.5 text-[0.95rem] hairline hover:bg-stand-hover"
                >
                  {pause.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Saved rules: "Krepšinis 4 %+", "Tik TopSport". Applying one writes
            into the same settings the bot reads. */}
        <div>
          <p className="text-[0.75rem] tracking-[0.06em] text-haze-dim uppercase">Rinkiniai</p>
          {state.presets.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {state.presets.map((preset) => (
                <li key={preset.id} className="flex items-center rounded-lg bg-stand hairline">
                  <button
                    type="button"
                    onClick={() =>
                      command(
                        '/api/telegram/presets',
                        { method: 'POST', body: JSON.stringify({ apply: true, settings: preset.settings }) },
                        `Pritaikyta: ${preset.name}.`,
                      )
                    }
                    className="min-h-11 rounded-l-lg px-3.5 text-[0.95rem] hover:bg-stand-hover"
                  >
                    {preset.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Ištrinti rinkinį ${preset.name}`}
                    onClick={() => command(`/api/telegram/presets?id=${preset.id}`, { method: 'DELETE' }, 'Rinkinys ištrintas.')}
                    className="min-h-11 rounded-r-lg px-2.5 text-haze hover:text-brick"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={presetName}
              maxLength={40}
              placeholder="Pavadinimas, pvz. „Krepšinis 4 %+“"
              onChange={(event) => setPresetName(event.target.value)}
              className="h-11 min-w-[14rem] flex-1 rounded-lg bg-stand px-3 text-[0.95rem] text-chalk hairline placeholder:text-haze-dim"
            />
            <button
              type="button"
              disabled={!presetName.trim()}
              onClick={async () => {
                await command(
                  '/api/telegram/presets',
                  { method: 'POST', body: JSON.stringify({ name: presetName.trim(), settings: s }) },
                  `Išsaugota: ${presetName.trim()}.`,
                )
                setPresetName('')
              }}
              className="h-11 rounded-lg bg-rail px-3.5 font-medium hover:bg-rail-strong disabled:opacity-50"
            >
              Išsaugoti šiuos filtrus
            </button>
          </div>
        </div>
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
