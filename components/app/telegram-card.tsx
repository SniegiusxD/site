'use client'

import { Check, Loader2, Send } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BookMark } from '@/components/landing/book-mark'
import { BOOKS, type BookName } from '@/lib/landing-signals'
import type { TelegramState } from '@/lib/telegram'
import { TELEGRAM_EDGE_CHOICES, TELEGRAM_HOUR_CHOICES, type TelegramSettings } from '@/lib/telegram-settings'
import { ChipGroup } from './chip-group'

const SAVE_DELAY_MS = 600
const LINK_POLL_MS = 3000
const LINK_POLL_LIMIT = 60
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`

export function TelegramCard() {
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
    load()
  }, [load])

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

  if (!state) {
    return error ? <p className="text-brick">{error}</p> : <Loader2 className="size-5 animate-spin text-haze" aria-label="Įkeliama" />
  }

  const s = state.settings
  const quietOn = s.quietStart !== null && s.quietEnd !== null
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
            className="inline-flex items-center gap-2 rounded-xl bg-chalk px-5 py-3 font-semibold text-night transition-transform hover:bg-white active:scale-[0.97] disabled:opacity-60"
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

      <div className={`mt-6 space-y-6 ${state.connected ? '' : 'opacity-80'}`}>
        <label className="flex items-center justify-between gap-4">
          <span className="font-medium">Siųsti signalus</span>
          <input
            type="checkbox"
            checked={s.enabled}
            onChange={(event) => update({ enabled: event.target.checked })}
            className="size-5 accent-[var(--pitch)]"
          />
        </label>
        <ChipGroup
          size="md"
          label="Mažiausia vertė"
          options={TELEGRAM_EDGE_CHOICES.map((value) => ({ value, label: `nuo ${Math.round(value * 100)} %` }))}
          value={s.minEdge as (typeof TELEGRAM_EDGE_CHOICES)[number]}
          onChange={(minEdge) => update({ minEdge })}
        />
        <ChipGroup
          size="md"
          label="Laikas iki rungtynių"
          options={TELEGRAM_HOUR_CHOICES.map((value) => ({ value, label: `${value} val.` }))}
          value={s.maxHoursToStart as (typeof TELEGRAM_HOUR_CHOICES)[number]}
          onChange={(maxHoursToStart) => update({ maxHoursToStart })}
        />
        <fieldset>
          <legend className="font-medium">Kontoros</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {BOOKS.map((book) => {
              const on = s.books.includes(book)
              return (
                <button
                  key={book}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleBook(book)}
                  className={`inline-flex items-center gap-2 rounded-full py-1 pr-3.5 pl-1 font-medium transition-colors ${on ? 'bg-rail text-chalk' : 'text-haze hover:text-chalk'}`}
                >
                  <BookMark book={book} size="sm" />
                  {book}
                </button>
              )
            })}
          </div>
        </fieldset>
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
