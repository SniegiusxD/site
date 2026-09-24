'use client'

import NumberFlow from '@number-flow/react'
import { Check, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useId, useMemo, useState } from 'react'
import { BookMark } from '@/components/landing/book-mark'
import { authClient } from '@/lib/auth-client'
import { betStats } from '@/lib/bet-value'
import { formatEdge, formatEuro } from '@/lib/format-lt'
import type { ActiveBet } from '@/lib/types'
import { signedEuro } from './value-chart'
import { BOOKS, type BookName } from '@/lib/landing-signals'
import { SuggestBook } from './suggest-book'
import { DAILY_BET_CHOICES, KELLY_CHOICES, type Preferences } from '@/lib/preferences'
import { useApi } from '@/lib/use-api'
import { PRICE_EUR_PER_MONTH, TRIAL_DAYS } from '@/lib/subscription'
import { useAccount } from './account-provider'
import { BankrollDialog } from './bankroll-dialog'
import { AccountDataControls } from './account-data-controls'
import { BillingCard } from './billing-card'
import { ChipGroup } from './chip-group'
import { LimitHistory } from './limit-history'
import { TelegramCard } from './telegram-card'

const KELLY_LABEL: Record<(typeof KELLY_CHOICES)[number], string> = { 0.125: 'Atsargiai (⅛)', 0.25: 'Subalansuotai (¼)', 0.5: 'Drąsiai (½)' }

const dateFormat = new Intl.DateTimeFormat('lt-LT', { timeZone: 'Europe/Vilnius', month: 'long', day: 'numeric' })
const sinceFormat = new Intl.DateTimeFormat('lt-LT', { timeZone: 'Europe/Vilnius', year: 'numeric', month: 'long', day: 'numeric' })

export function ProfileView() {
  const router = useRouter()
  const { account, email, memberSince, updateSettings, saveError } = useAccount()
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
          : access.canStartTrial
            ? `Nemokamas planas, ${TRIAL_DAYS} dienų bandymas dar nepanaudotas`
            : 'Nemokamas planas'

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

      <ProfileSummary email={email} plan={plan} memberSince={memberSince} />

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
            className="rounded-xl bg-floodlight px-5 py-3 font-semibold text-night transition-transform hover:-translate-y-0.5 active:scale-[0.97]"
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
        <SuggestBook />
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
          label="Rizika: kokią Kelly dalį naudoti"
          options={KELLY_CHOICES.map((value) => ({ value, label: KELLY_LABEL[value] }))}
          value={prefs.kellyFraction as (typeof KELLY_CHOICES)[number]}
          onChange={(kellyFraction) => updateSettings({ kellyFraction })}
        />
        <StakePreview prefs={prefs} />
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
        <LimitHistory />
      </Section>


      <Section title="Prenumerata" id="prenumerata">
        <BillingCard />
      </Section>

      <Section title="Telegram pranešimai" id="telegram">
        <TelegramCard />
      </Section>

      <Section title="Paskyra">
        <p>{email}</p>
        <p className="mt-1 text-haze">{plan}</p>
        <p className="mt-3 text-[0.95rem] text-haze">
          Nori viską nustatyti iš naujo, žingsnis po žingsnio?{' '}
          <Link href="/pradzia?is_naujo" className="text-chalk underline decoration-rail-strong underline-offset-4 hover:decoration-chalk">
            Pereiti pradžią dar kartą
          </Link>
        </p>
        <button
          type="button"
          onClick={signOut}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rail px-4 py-2.5 font-medium transition-colors hover:bg-rail-strong"
        >
          <LogOut className="size-4" aria-hidden />
          Atsijungti
        </button>
        <AccountDataControls email={email} />
      </Section>

      <BankrollDialog open={bankrollOpen} onClose={closeBankroll} />
    </main>
  )
}

/** Who the member is and how their bets are going, above the settings. */
function ProfileSummary({ email, plan, memberSince }: { email: string; plan: string; memberSince: string | null }) {
  // On failure the settings below still work; the numbers stay as placeholders.
  const { data } = useApi<{ bets: ActiveBet[] }>('/api/bets')
  const summary = useMemo(() => (data ? { stats: betStats(data.bets), count: data.bets.length } : null), [data])

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
          {memberSince && (
            <p className="mt-0.5 text-[0.85rem] text-haze-dim">Narys nuo {sinceFormat.format(new Date(memberSince))}</p>
          )}
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

// One example signal for the preview: 2,06 against a fair 2,00 (+3 %), as in onboarding.
const EXAMPLE = { odds: 2.06, fair: 2 }
const STAKE_CAP = 0.05

/**
 * What the chosen Kelly share means in euros, worked through on one example,
 * and what cut it: the 5 % ceiling or a bookmaker's limit. Mirrors
 * suggestedStake in lib/preferences.ts.
 */
function StakePreview({ prefs }: { prefs: Preferences }) {
  const p = 1 / EXAMPLE.fair
  const b = EXAMPLE.odds - 1
  const fullKelly = Math.max(0, (b * p - (1 - p)) / b)
  const share = fullKelly * prefs.kellyFraction
  const capped = share > STAKE_CAP
  const raw = prefs.bankroll * Math.min(STAKE_CAP, share)
  const rows = BOOKS.filter((book) => prefs.books.includes(book)).map((book) => {
    const limit = prefs.bookLimits[book]
    const stake = Math.floor(limit !== undefined ? Math.min(raw, limit) : raw)
    return { book, stake, limited: limit !== undefined && limit < raw }
  })
  const percent = (value: number) => `${(value * 100).toLocaleString('lt-LT', { maximumFractionDigits: 1 })} %`
  return (
    <div className="mt-4 rounded-xl bg-night/60 p-4 text-[0.95rem]">
      <p className="text-haze">
        Pavyzdys: signalas +3 % vertės, koef. 2,06. Pilnas Kelly — {percent(fullKelly)} bankrollo, tavo dalis —{' '}
        <span className="font-semibold text-chalk">{percent(Math.min(STAKE_CAP, share))}</span>
        {capped ? ', apkirpta iki 5 % viršutinės ribos' : ''}, tai yra{' '}
        <span className="font-semibold text-chalk">{formatEuro(Math.floor(raw))}</span> iš {formatEuro(prefs.bankroll)}.
      </p>
      {rows.some((row) => row.limited) && (
        <ul className="mt-2 grid gap-1">
          {rows.map((row) => (
            <li key={row.book} className="flex justify-between gap-4">
              <span className="text-haze">{row.book}</span>
              <span className={row.limited ? 'text-warning' : ''}>
                {formatEuro(row.stake)}
                {row.limited ? ' — apribota tavo limito' : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
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
