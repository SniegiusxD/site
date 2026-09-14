'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { BookMark } from '@/components/landing/book-mark'
import { brand } from '@/lib/brand'
import { formatEuro, formatOdds } from '@/lib/format-lt'
import { BOOKS, type BookName } from '@/lib/landing-signals'
import { KELLY_CHOICES, type Preferences, suggestedStake } from '@/lib/preferences'

const EASE = [0.22, 1, 0.36, 1] as const
const STEPS = ['Bankrollas', 'Kontoros', 'Signalai', 'Rizika'] as const

const BANKROLL_PRESETS = [250, 500, 1000, 2500]
const EDGE_CHOICES = [0.01, 0.02, 0.03, 0.05]
const HOUR_CHOICES = [
  { value: 6, label: '6 val.' },
  { value: 24, label: '24 val.' },
  { value: 48, label: '2 dienos' },
  { value: 168, label: '7 dienos' },
]
const ODDS_PRESETS = [
  { label: 'Visi', min: 1.3, max: 6 },
  { label: 'Iki 3,00', min: 1.3, max: 3 },
  { label: '1,50–2,50', min: 1.5, max: 2.5 },
]
const KELLY_COPY: Record<(typeof KELLY_CHOICES)[number], { name: string; note: string }> = {
  0.125: { name: '⅛ Kelly', note: 'Atsargiai. Mažesnės sumos ir ramesni svyravimai.' },
  0.25: { name: '¼ Kelly', note: 'Rekomenduojam. Taip sumas skaičiuoja mūsų sistema.' },
  0.5: { name: '½ Kelly', note: 'Drąsiai. Didesnės sumos ir gerokai didesni svyravimai.' },
}

// Stake previews use one example signal: 2,06 against a fair 2,00 (+3 %).
const EXAMPLE = { odds: 2.06, fair: 2 }

const percent = (fraction: number) => `${Math.round(fraction * 100)} %`

export function OnboardingFlow({ initial }: { initial: Preferences }) {
  const router = useRouter()
  const reduced = useReducedMotion()
  const [prefs, setPrefs] = useState<Preferences>(initial)
  const [bankrollText, setBankrollText] = useState(String(initial.bankroll))
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (patch: Partial<Preferences>) => setPrefs((current) => ({ ...current, ...patch }))
  const last = step === STEPS.length - 1

  function stepError(): string | null {
    if (step === 0 && !(prefs.bankroll >= 10)) return 'Bankrollas turi būti bent 10 €.'
    if (step === 1 && prefs.books.length === 0) return 'Pasirink bent vieną kontorą.'
    if (step === 2 && !(prefs.minOdds < prefs.maxOdds)) return 'Mažiausias koeficientas turi būti mažesnis už didžiausią.'
    return null
  }

  function go(delta: number) {
    setError(null)
    setDirection(delta)
    setStep((current) => Math.min(STEPS.length - 1, Math.max(0, current + delta)))
  }

  async function next(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problem = stepError()
    if (problem) {
      setError(problem)
      return
    }
    if (!last) {
      go(1)
      return
    }
    setPending(true)
    setError(null)
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        setError(body?.error ?? 'Nepavyko išsaugoti. Bandyk dar kartą.')
        return
      }
      router.push('/signalai')
      router.refresh()
    } catch {
      setError('Nepavyko pasiekti serverio. Patikrink ryšį ir bandyk dar kartą.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-[44rem] items-center justify-between gap-4 px-5 pt-6 sm:px-8">
        <Link href="/" className="font-display text-[1.6rem] leading-none font-extrabold">
          {brand.name}
        </Link>
        <p className="text-[0.95rem] text-haze">
          Žingsnis {step + 1} iš {STEPS.length}
        </p>
      </header>
      <div className="mx-auto mt-5 flex w-full max-w-[44rem] gap-1.5 px-5 sm:px-8" aria-hidden>
        {STEPS.map((name, index) => (
          <span key={name} className="h-1 flex-1 overflow-hidden rounded-full bg-rail">
            <motion.span
              className="block h-full bg-chalk"
              initial={false}
              animate={{ width: index <= step ? '100%' : '0%' }}
              transition={{ duration: reduced ? 0 : 0.5, ease: EASE }}
            />
          </span>
        ))}
      </div>

      <form onSubmit={next} className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col px-5 pt-12 pb-8 sm:px-8">
        <div className="relative flex-1">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={reduced ? false : { opacity: 0, x: direction * 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: direction * -32 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              {step === 0 && (
                <BankrollStep
                  prefs={prefs}
                  text={bankrollText}
                  onText={(text) => {
                    setBankrollText(text)
                    const value = Number(text.replace(/\s/g, '').replace(',', '.'))
                    update({ bankroll: Number.isFinite(value) ? value : 0 })
                  }}
                />
              )}
              {step === 1 && <BooksStep prefs={prefs} update={update} />}
              {step === 2 && <SignalsStep prefs={prefs} update={update} />}
              {step === 3 && <RiskStep prefs={prefs} update={update} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {error && (
          <p role="alert" className="mt-8 rounded-xl bg-brick-soft px-4 py-3 text-brick">
            {error}
          </p>
        )}

        <div className="mt-10 flex items-center justify-between gap-4 border-t border-rail pt-6">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={step === 0}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-haze transition-colors hover:text-chalk disabled:invisible"
          >
            <ArrowLeft className="size-5" aria-hidden />
            Atgal
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl bg-chalk px-7 py-3.5 font-semibold text-night transition-transform duration-200 hover:bg-white active:scale-[0.97] disabled:opacity-70"
          >
            {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
            {last ? 'Rodyti signalus' : 'Toliau'}
          </button>
        </div>
      </form>
    </main>
  )
}

type StepProps = { prefs: Preferences; update: (patch: Partial<Preferences>) => void }

function StepTitle({ title, body }: { title: string; body: string }) {
  return (
    <>
      <h1 className="text-[2.6rem] sm:text-[3.4rem]">{title}</h1>
      <p className="mt-3 max-w-[34rem] text-haze">{body}</p>
    </>
  )
}

function BankrollStep({ prefs, text, onText }: { prefs: Preferences; text: string; onText: (text: string) => void }) {
  const inputId = useId()
  const stake = suggestedStake(prefs, '7BET', EXAMPLE.odds, EXAMPLE.fair)
  return (
    <div>
      <StepTitle title="Koks tavo bankrollas?" body="Suma, kurią skiri statymams. Iš jos skaičiuojam kiekvieno statymo dydį. Keisti galėsi bet kada." />
      <label htmlFor={inputId} className="sr-only">
        Bankrollas eurais
      </label>
      <div className="mt-10 flex cursor-text items-baseline gap-3 border-b-2 border-rail pb-2 transition-colors focus-within:border-chalk">
        <input
          id={inputId}
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(event) => onText(event.target.value.replace(/[^\d\s.,]/g, ''))}
          // Width follows the digits so the euro sign sits right after the number.
          style={{ width: `${Math.max(1, text.length) * 0.62 + 0.2}em` }}
          className="max-w-full min-w-0 bg-transparent font-display text-[4.5rem] leading-none font-extrabold outline-none sm:text-[6rem]"
        />
        <span className="font-display text-5xl font-extrabold text-haze">€</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {BANKROLL_PRESETS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onText(String(value))}
            className={`rounded-full px-4 py-2 font-medium transition-colors ${
              prefs.bankroll === value ? 'bg-chalk text-night' : 'bg-rail text-haze hover:text-chalk'
            }`}
          >
            {formatEuro(value)}
          </button>
        ))}
      </div>
      <p className="mt-8 rounded-xl bg-stand p-4 text-haze hairline">
        Signalui su +3 % verte (koef. {formatOdds(EXAMPLE.odds)}) siūlytume{' '}
        <span className="font-semibold text-chalk">{stake > 0 ? formatEuro(stake) : 'mažiau nei 1 €'}</span>.
      </p>
    </div>
  )
}

function BooksStep({ prefs, update }: StepProps) {
  const toggle = (book: BookName) =>
    update({
      books: prefs.books.includes(book)
        ? prefs.books.filter((b) => b !== book)
        : BOOKS.filter((b) => b === book || prefs.books.includes(b)),
    })
  return (
    <div>
      <StepTitle
        title="Kuriose kontorose turi paskyras?"
        body="Rodysim tik šių kontorų signalus. Kuo daugiau paskyrų, tuo dažniau rasi geriausią kainą."
      />
      <div className="mt-10 grid gap-3">
        {BOOKS.map((book) => {
          const on = prefs.books.includes(book)
          return (
            <button
              key={book}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(book)}
              className={`flex items-center justify-between gap-4 rounded-2xl p-5 text-left transition-[background-color,box-shadow] duration-200 ${
                on ? 'bg-stand shadow-[inset_0_0_0_1.5px_var(--chalk)]' : 'bg-stand hairline hover:bg-stand-hover'
              }`}
            >
              <span className="flex items-center gap-4">
                <BookMark book={book} />
                <span className="text-[1.15rem] font-medium">{book}</span>
              </span>
              <span
                className={`grid size-7 place-items-center rounded-full transition-colors ${
                  on ? 'bg-chalk text-night' : 'bg-rail text-transparent'
                }`}
              >
                <Check className="size-4" aria-hidden />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <fieldset>
      <legend className="font-medium">{label}</legend>
      <div role="radiogroup" className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-stand p-1.5 hairline sm:grid-cols-4">
        {options.map((option) => {
          const checked = option.value === value
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onChange(option.value)}
              className={`rounded-lg px-3 py-2.5 font-medium transition-colors ${
                checked ? 'bg-chalk text-night' : 'text-haze hover:text-chalk'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function SignalsStep({ prefs, update }: StepProps) {
  const minId = useId()
  const maxId = useId()
  const presetActive = (preset: (typeof ODDS_PRESETS)[number]) => preset.min === prefs.minOdds && preset.max === prefs.maxOdds
  return (
    <div>
      <StepTitle title="Kokie signalai tau tinka?" body="Visa tai vėliau pakeisi signalų filtre. Jei dvejoji, palik kaip yra." />
      <div className="mt-10 space-y-8">
        <Segmented
          label="Mažiausia vertė"
          options={EDGE_CHOICES.map((value) => ({ value, label: `nuo ${percent(value)}` }))}
          value={prefs.minEdge}
          onChange={(minEdge) => update({ minEdge })}
        />
        <Segmented
          label="Kiek laiko iki rungtynių"
          options={HOUR_CHOICES}
          value={prefs.maxHoursToStart}
          onChange={(maxHoursToStart) => update({ maxHoursToStart })}
        />
        <fieldset>
          <legend className="font-medium">Koeficientai</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {ODDS_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                aria-pressed={presetActive(preset)}
                onClick={() => update({ minOdds: preset.min, maxOdds: preset.max })}
                className={`rounded-full px-4 py-2 font-medium transition-colors ${
                  presetActive(preset) ? 'bg-chalk text-night' : 'bg-rail text-haze hover:text-chalk'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <OddsInput id={minId} label="Nuo" value={prefs.minOdds} onChange={(minOdds) => update({ minOdds })} />
            <OddsInput id={maxId} label="Iki" value={prefs.maxOdds} onChange={(maxOdds) => update({ maxOdds })} />
          </div>
        </fieldset>
      </div>
    </div>
  )
}

function OddsInput({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (value: number) => void }) {
  const [text, setText] = useState(formatOdds(value))
  return (
    <div>
      <label htmlFor={id} className="text-[0.9rem] text-haze">
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        value={text}
        onChange={(event) => {
          const next = event.target.value.replace(/[^\d.,]/g, '')
          setText(next)
          const parsed = Number(next.replace(',', '.'))
          if (Number.isFinite(parsed) && parsed > 1) onChange(parsed)
        }}
        onBlur={() => setText(formatOdds(value))}
        className="mt-1.5 h-12 w-full rounded-xl bg-stand px-4 font-semibold outline-none hairline focus:shadow-[inset_0_0_0_1.5px_var(--chalk)]"
      />
    </div>
  )
}

function RiskStep({ prefs, update }: StepProps) {
  return (
    <div>
      <StepTitle
        title="Kiek rizikuoti?"
        body="Kelly kriterijus parenka sumą pagal vertę ir koeficientą. Mes naudojam tik jo dalį, kad svyravimai būtų pakeliami."
      />
      <div role="radiogroup" aria-label="Kelly dalis" className="mt-10 grid gap-3">
        {KELLY_CHOICES.map((fraction) => {
          const checked = prefs.kellyFraction === fraction
          const stake = suggestedStake({ ...prefs, kellyFraction: fraction }, '7BET', EXAMPLE.odds, EXAMPLE.fair)
          return (
            <button
              key={fraction}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => update({ kellyFraction: fraction })}
              className={`flex items-center justify-between gap-4 rounded-2xl bg-stand p-5 text-left transition-[background-color,box-shadow] duration-200 ${
                checked ? 'shadow-[inset_0_0_0_1.5px_var(--chalk)]' : 'hairline hover:bg-stand-hover'
              }`}
            >
              <span>
                <span className="block text-[1.15rem] font-medium">{KELLY_COPY[fraction].name}</span>
                <span className="mt-1 block text-[0.95rem] text-haze">{KELLY_COPY[fraction].note}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-display text-3xl font-bold tnum">{formatEuro(stake)}</span>
                <span className="block text-[0.8rem] text-haze-dim">+3 % signalui</span>
              </span>
            </button>
          )
        })}
      </div>

      <fieldset className="mt-10">
        <legend className="font-medium">Kontorų limitai</legend>
        <p className="mt-1 text-[0.95rem] text-haze">
          Jei kontora leidžia statyti mažiau, nei siūlo Kelly, įrašyk limitą. Nežinai? Palik tuščią.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {prefs.books.map((book) => (
            <LimitInput
              key={book}
              book={book}
              value={prefs.bookLimits[book]}
              onChange={(limit) => {
                const bookLimits = { ...prefs.bookLimits }
                if (limit === undefined) delete bookLimits[book]
                else bookLimits[book] = limit
                update({ bookLimits })
              }}
            />
          ))}
        </div>
      </fieldset>
    </div>
  )
}

function LimitInput({ book, value, onChange }: { book: BookName; value: number | undefined; onChange: (value: number | undefined) => void }) {
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
          className="h-12 w-full rounded-xl bg-stand pr-9 pl-4 font-semibold outline-none hairline placeholder:font-normal placeholder:text-haze-dim focus:shadow-[inset_0_0_0_1.5px_var(--chalk)]"
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-haze">€</span>
      </div>
    </div>
  )
}
