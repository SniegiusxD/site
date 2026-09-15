'use client'

import NumberFlow from '@number-flow/react'
import { Check, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useId, useState } from 'react'
import { BookMark } from '@/components/landing/book-mark'
import { authClient } from '@/lib/auth-client'
import { type BetStats, betStats } from '@/lib/bet-value'
import { formatEdge, formatEuro } from '@/lib/format-lt'
import type { ActiveBet } from '@/lib/types'
import { signedEuro } from './value-chart'
import { BOOKS, type BookName } from '@/lib/landing-signals'
import { DAILY_BET_CHOICES, KELLY_CHOICES } from '@/lib/preferences'
import { PRICE_EUR_PER_MONTH } from '@/lib/subscription'
import { useAccount } from './account-provider'
import { BankrollDialog } from './bankroll-dialog'
import { ChipGroup } from './chip-group'
import { TelegramCard } from './telegram-card'

const KELLY_LABEL: Record<(typeof KELLY_CHOICES)[number], string> = { 0.125: '⅛ Kelly', 0.25: '¼ Kelly', 0.5: '½ Kelly' }

const dateFormat = new Intl.DateTimeFormat('lt-LT', { timeZone: 'Europe/Vilnius', month: 'long', day: 'numeric' })

export function ProfileView() {
  const router = useRouter()
  const { account, email, updateSettings, saveError } = useAccount()
  const prefs = account.preferences
  const [bankrollOpen, setBankrollOpen] = useState(false)
  const closeBankroll = useCallback(() => setBankrollOpen(false), [])

  const access = account.access
  const plan =
    access.state === 'trial'
      ? `Nemokamas bandymas iki ${dateFormat.format(new Date(access.endsAt!))}`
      : access.state === 'active'
        ? `Prenumerata aktyvi, ${PRICE_EUR_PER_MONTH} € per mėnesį`
        : access.state === 'ending'
          ? `Prenumerata baigsis ${dateFormat.format(new Date(access.endsAt!))}`
          : 'Prieiga baigėsi'

  function toggleBook(book: BookName) {
    const next = prefs.books.includes(book) ? prefs.books.filter((b) => b !== book) : BOOKS.filter((b) => b === book || prefs.books.includes(b))
    if (next.length) updateSettings({ books: next })
  }

  async function signOut() {
    await authClient.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <main className="mx-auto max-w-[48rem] px-4 pt-6 pb-16 sm:px-8 lg:pt-10">
      <h1 className="text-[2.4rem] sm:text-[3rem]">Profilis</h1>
      <p className="mt-2 text-haze">Pakeitimai išsaugomi iš karto.</p>
      {saveError && <p role="alert" className="mt-4 rounded-xl bg-brick-soft px-4 py-3 text-brick">{saveError}</p>}

      <ProfileSummary email={email} plan={plan} />

      <Section title="Bankrollas">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-5xl font-bold tnum">
              <NumberFlow value={account.bankroll.current} locales="lt-LT" format={{ maximumFractionDigits: 2 }} suffix=" €" />
            </p>
            <p className="mt-1 text-[0.95rem] text-haze">
              Įnešta {formatEuro(account.bankroll.deposited)}
              {account.bankroll.settledProfit !== 0 &&
                `, statymų rezultatas ${account.bankroll.settledProfit > 0 ? '+' : ''}${formatEuro(account.bankroll.settledProfit, 2)}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBankrollOpen(true)}
            className="rounded-xl bg-chalk px-5 py-3 font-semibold text-night transition-transform hover:bg-white active:scale-[0.97]"
          >
            Įnešti arba išimti
          </button>
        </div>
      </Section>

      <Section title="Kontoros">
        <div className="grid gap-2 sm:grid-cols-3">
          {BOOKS.map((book) => {
            const on = prefs.books.includes(book)
            return (
              <button
                key={book}
                type="button"
                aria-pressed={on}
                onClick={() => toggleBook(book)}
                className={`flex items-center justify-between gap-3 rounded-xl bg-night/60 p-4 text-left transition-shadow ${on ? 'shadow-[inset_0_0_0_1.5px_var(--chalk)]' : 'hairline'}`}
              >
                <span className="flex items-center gap-3 font-medium">
                  <BookMark book={book} />
                  {book}
                </span>
                <span className={`grid size-6 place-items-center rounded-full ${on ? 'bg-chalk text-night' : 'bg-rail text-transparent'}`}>
                  <Check className="size-3.5" aria-hidden />
                </span>
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="Kokius signalus rodyti">
        <div className="space-y-6">
          <ChipGroup
            size="md"
            label="Mažiausia vertė"
            options={[0.01, 0.02, 0.03, 0.05].map((value) => ({ value, label: `nuo ${Math.round(value * 100)} %` }))}
            value={prefs.minEdge}
            onChange={(minEdge) => updateSettings({ minEdge })}
          />
          <ChipGroup
            size="md"
            label="Kiek laiko iki rungtynių"
            options={[
              { value: 6, label: '6 val.' },
              { value: 24, label: '24 val.' },
              { value: 48, label: '2 dienos' },
              { value: 168, label: '7 dienos' },
            ]}
            value={prefs.maxHoursToStart}
            onChange={(maxHoursToStart) => updateSettings({ maxHoursToStart })}
          />
          <ChipGroup
            size="md"
            label="Koeficientai"
            options={[
              { value: '1.3-6', label: 'Visi' },
              { value: '1.3-3', label: 'Iki 3,00' },
              { value: '1.5-2.5', label: '1,50–2,50' },
            ]}
            value={`${prefs.minOdds}-${prefs.maxOdds}`}
            onChange={(range) => {
              const [minOdds, maxOdds] = range.split('-').map(Number)
              updateSettings({ minOdds, maxOdds })
            }}
          />
        </div>
      </Section>

      <Section title="Sumos ir limitai">
        <ChipGroup
          size="md"
          label="Dienos tikslas: statymų per dieną"
          options={DAILY_BET_CHOICES.map((value): { value: number; label: string } => ({ value, label: String(value) }))}
          value={prefs.dailyBets}
          onChange={(dailyBets) => updateSettings({ dailyBets })}
        />
        <div className="mt-6" />
        <ChipGroup
          size="md"
          label="Kelly dalis"
          options={KELLY_CHOICES.map((value) => ({ value, label: KELLY_LABEL[value] }))}
          value={prefs.kellyFraction as (typeof KELLY_CHOICES)[number]}
          onChange={(kellyFraction) => updateSettings({ kellyFraction })}
        />
        <p className="mt-6 font-medium">Kontorų limitai</p>
        <p className="mt-1 text-[0.95rem] text-haze">Siūloma suma niekada neviršys čia įrašyto limito. Tuščia: be limito.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {BOOKS.map((book) => (
            <LimitField
              key={book}
              book={book}
              value={prefs.bookLimits[book]}
              onChange={(limit) => {
                const bookLimits = { ...prefs.bookLimits }
                if (limit === undefined) delete bookLimits[book]
                else bookLimits[book] = limit
                updateSettings({ bookLimits })
              }}
            />
          ))}
        </div>
      </Section>

      <Section title="Telegram pranešimai" id="telegram">
        <TelegramCard />
      </Section>

      <Section title="Paskyra">
        <p>{email}</p>
        <p className="mt-1 text-haze">{plan}</p>
        <button
          type="button"
          onClick={signOut}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rail px-4 py-2.5 font-medium transition-colors hover:bg-rail-strong"
        >
          <LogOut className="size-4" aria-hidden />
          Atsijungti
        </button>
      </Section>

      <BankrollDialog open={bankrollOpen} onClose={closeBankroll} />
    </main>
  )
}

/** Who the member is and how their bets are going, above the settings. */
function ProfileSummary({ email, plan }: { email: string; plan: string }) {
  const [summary, setSummary] = useState<{ stats: BetStats; count: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/bets', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (cancelled || !body) return
        const bets = body.bets as ActiveBet[]
        setSummary({ stats: betStats(bets), count: bets.length })
      })
      .catch(() => {
        // The settings below still work; the numbers stay as placeholders.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stats = summary?.stats
  const tone = (value: number) => (value > 0.004 ? 'text-pitch' : value < -0.004 ? 'text-brick' : '')

  return (
    <section aria-label="Tavo suvestinė" className="mt-8 overflow-hidden rounded-2xl bg-stand hairline">
      <div className="flex items-center gap-4 p-5 sm:p-7">
        <span
          aria-hidden
          className="grid size-14 shrink-0 place-items-center rounded-2xl bg-floodlight-soft font-display text-3xl font-extrabold text-floodlight"
        >
          {(email.trim()[0] ?? '?').toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[1.1rem] font-medium">{email}</p>
          <p className="mt-0.5 text-[0.95rem] text-haze">{plan}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-px border-t border-rail bg-rail sm:grid-cols-4">
        <SummaryStat label="Rezultatas" className={stats ? tone(stats.profit) : ''}>
          {stats ? signedEuro(stats.profit) : null}
        </SummaryStat>
        <SummaryStat label="Grąža">{stats ? (stats.roi === null ? '–' : formatEdge(stats.roi)) : null}</SummaryStat>
        <SummaryStat label="Vidutinis CLV">{stats ? (stats.clvAverage === null ? '–' : formatEdge(stats.clvAverage)) : null}</SummaryStat>
        <SummaryStat label="Pažymėti statymai">{summary ? String(summary.count) : null}</SummaryStat>
      </dl>
    </section>
  )
}

function SummaryStat({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className="bg-stand p-4 sm:p-5">
      <dt className="text-[0.85rem] text-haze">{label}</dt>
      <dd className={`mt-1.5 font-display text-[1.8rem] leading-none font-bold tnum ${className}`}>
        {children ?? (
          <>
            <span aria-hidden className="inline-block h-7 w-16 animate-pulse rounded-md bg-rail align-middle" />
            <span className="sr-only">Įkeliama</span>
          </>
        )}
      </dd>
    </div>
  )
}

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-6 scroll-mt-20 rounded-2xl bg-stand p-5 hairline sm:p-7">
      <h2 className="mb-5 text-[1.6rem]">{title}</h2>
      {children}
    </section>
  )
}

function LimitField({ book, value, onChange }: { book: BookName; value: number | undefined; onChange: (value: number | undefined) => void }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-2 text-[0.9rem] text-haze">
        <BookMark book={book} size="sm" />
        {book}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          inputMode="numeric"
          placeholder="be limito"
          value={value ?? ''}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '')
            onChange(digits ? Number(digits) : undefined)
          }}
          className="h-12 w-full rounded-xl bg-night/60 pr-9 pl-4 font-semibold outline-none hairline placeholder:font-normal placeholder:text-haze-dim focus:shadow-[inset_0_0_0_1.5px_var(--chalk)]"
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-haze">€</span>
      </div>
    </div>
  )
}
