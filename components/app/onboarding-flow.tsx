'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useState } from 'react'
import { BookMark } from '@/components/landing/book-mark'
import { brand } from '@/lib/brand'
import { edgeOf, formatEdge, formatEuro, formatInteger, formatOdds, ltPlural } from '@/lib/format-lt'
import { BOOKS, type BookName, landingSignals } from '@/lib/landing-signals'
import { PACE_CHOICES, TRACK_RECORD, daysTo, recordPeriodLabel, simulationStake, timeLabel } from '@/lib/pace'
import { KELLY_CHOICES, type Preferences, STAKE_CEILING, suggestedStake } from '@/lib/preferences'
import type { SignalCounts } from '@/lib/signal-counts'
import { DEFAULT_TELEGRAM_SETTINGS } from '@/lib/telegram-settings'
import { sampleStretches, simulate } from '@/lib/simulate'
import { HardTimes } from './hard-times'
import { Outlook } from './outlook'
import { signedWhole } from './scenario-chart'
import { SuggestBook } from './suggest-book'
import { FINISHED_STEP, reportFunnelStep } from '@/lib/funnel-client'
import { EASE } from '@/lib/motion'

const STEPS = ['Prieš pradedant', 'Bankrollas', 'Kontoros', 'Signalai', 'Rizika', 'Tempas', 'Pranešimai'] as const

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

export function OnboardingFlow({ initial, counts }: { initial: Preferences; counts: SignalCounts | null }) {
  const router = useRouter()
  const reduced = useReducedMotion()
  const [prefs, setPrefs] = useState<Preferences>(initial)
  const [bankrollText, setBankrollText] = useState(String(initial.bankroll))
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Asked last, once the member has seen what a signal contains.
  const [notify, setNotify] = useState<NotifyChoice>({ channel: 'site', minEdge: 0.03, quiet: true })

  // Anonymous: which step this browser reached, for the owner's funnel.
  useEffect(() => reportFunnelStep(step), [step])

  const update = (patch: Partial<Preferences>) => setPrefs((current) => ({ ...current, ...patch }))
  const last = step === STEPS.length - 1

  function stepError(): string | null {
    if (step === 1 && !(prefs.bankroll >= 10)) return 'Bankrollas turi būti bent 10 €.'
    if (step === 2 && prefs.books.length === 0) return 'Pasirink bent vieną kontorą.'
    if (step === 3 && !(prefs.minOdds < prefs.maxOdds)) return 'Mažiausias koeficientas turi būti mažesnis už didžiausią.'
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
      // A short beat of "done" before leaving: the last click should feel like
      // finishing something, not like a page swap. Skipped in calm mode.
      setDone(true)
      reportFunnelStep(FINISHED_STEP)
      if (!reduced) await new Promise((resolve) => window.setTimeout(resolve, 450))
      if (notify.channel === 'telegram') {
        // The rules are saved now and apply the moment a chat is connected. A
        // failure here must not undo a finished onboarding: the profile shows
        // the same settings.
        await fetch('/api/telegram', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...DEFAULT_TELEGRAM_SETTINGS,
            books: prefs.books,
            minEdge: notify.minEdge,
            quietStart: notify.quiet ? 0 : null,
            quietEnd: notify.quiet ? 8 : null,
          }),
        }).catch(() => null)
        router.push('/profilis#telegram')
      } else {
        router.push('/signalai')
      }
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
              {step === 0 && <BeforeStep />}
              {step === 1 && (
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
              {step === 2 && <BooksStep prefs={prefs} update={update} counts={counts} />}
              {step === 3 && <SignalsStep prefs={prefs} update={update} />}
              {step === 4 && <RiskStep prefs={prefs} update={update} />}
              {step === 5 && (
                <>
                  <PaceStep prefs={prefs} update={update} />
                  <SampleSignal prefs={prefs} />
                </>
              )}
              {step === 6 && <NotifyStep value={notify} onChange={setNotify} />}
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
            disabled={pending || done}
            className="inline-flex items-center gap-2 rounded-xl bg-floodlight px-7 py-3.5 font-semibold text-night transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-70"
          >
            {done ? (
              <>
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <motion.path d="M20 6 9 17l-5-5" initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, ease: EASE }} />
                </svg>
                Paruošta
              </>
            ) : (
              <>
                {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
                {last ? (notify.channel === 'telegram' ? 'Prijungti Telegram' : 'Rodyti signalus') : step === 0 ? 'Supratau' : 'Toliau'}
              </>
            )}
          </button>
        </div>
      </form>
    </main>
  )
}

type StepProps = { prefs: Preferences; update: (patch: Partial<Preferences>) => void }

/**
 * The last thing onboarding shows is a real signal, priced against this
 * member's own bankroll, so the first board is not the first time they see one.
 */
function SampleSignal({ prefs }: { prefs: Preferences }) {
  const signal = landingSignals.find((entry) => entry.prices.length >= 2) ?? landingSignals[0]
  const price = signal.prices.find((entry) => entry.book === signal.valueBook) ?? signal.prices[0]
  const edge = edgeOf(price.odds, signal.fairOdds)
  const stake = suggestedStake(prefs, price.book, price.odds, signal.fairOdds)

  return (
    <section aria-label="Pavyzdinis signalas" className="mt-8 rounded-2xl bg-stand p-5 hairline sm:p-6">
      <p className="text-[0.9rem] text-haze">Taip atrodys tavo pirmas signalas</p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{price.event}</p>
          <p className="mt-0.5 text-[0.9rem] text-haze">
            {signal.market}: {price.selection}
          </p>
        </div>
        <p className="text-right">
          <span className="block font-display text-[1.6rem] leading-none font-bold text-floodlight tnum">{formatEdge(edge)}</span>
          <span className="text-[0.85rem] text-haze">vertė</span>
        </p>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-rail pt-3.5 text-[0.9rem]">
        <div>
          <dt className="text-haze">{price.book}</dt>
          <dd className="mt-0.5 font-semibold tnum">{formatOdds(price.odds)}</dd>
        </div>
        <div>
          <dt className="text-haze">Tikroji kaina</dt>
          <dd className="mt-0.5 font-semibold tnum">{formatOdds(signal.fairOdds)}</dd>
        </div>
        <div>
          <dt className="text-haze">Tavo suma</dt>
          <dd className="mt-0.5 font-semibold tnum">{formatEuro(stake, 2)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[0.85rem] text-haze-dim">
        Tikras signalas iš mūsų skenavimo. Suma suskaičiuota nuo tavo {formatEuro(prefs.bankroll)} banko.
      </p>
    </section>
  )
}

const BEFORE_POINTS = [
  {
    lead: 'Signalas nėra statymas.',
    body: 'Statai tu, savo kontoroje. Mes parodom kainą, kuri atrodo didesnė, nei turėtų būti, ir kiek už ją statyti.',
  },
  {
    lead: 'Prieš statydamas patikrink kainą.',
    body: 'Koeficientai keičiasi kas kelias minutes. Jei kontora jau siūlo mažiau ir vertės neliko, praleisk.',
  },
  {
    lead: 'Minusinės dienos ir savaitės yra normalu.',
    body: 'Vertė atsiperka per šimtus statymų, o ne per vieną ar dešimt. Vienas pralaimėjimas nieko nepasako.',
  },
  {
    lead: 'Suma skaičiuojama nuo tavo bankrollo.',
    body: 'Rezultatus vertinam pagal atskiras rungtynes: kelios linijos tose pačiose rungtynėse yra viena nuomonė, ne kelios.',
  },
] as const

/** What a signal is and is not, before any numbers are asked for. */
function BeforeStep() {
  return (
    <div>
      <StepTitle title="Prieš pradedant" body="Keturi dalykai, kuriuos verta žinoti prieš pirmą signalą. Užtruks minutę." />
      <ul className="mt-10 grid gap-3">
        {BEFORE_POINTS.map((point) => (
          <li key={point.lead} className="rounded-2xl bg-stand p-5 hairline">
            <p className="text-[1.1rem] font-medium">{point.lead}</p>
            <p className="mt-1 text-[0.95rem] text-haze">{point.body}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[0.9rem] text-haze-dim">
        Tai nėra rekomendacija statyti. Tai matematinis būdas nustatyti statymus, kurių siūlomas koeficientas gali būti didesnis, nei
        rodo apskaičiuota tikimybė.{' '}
        <Link href="/metodika" className="underline decoration-rail-strong underline-offset-4 hover:text-chalk">
          Kaip mes matuojam
        </Link>
      </p>
    </div>
  )
}

type NotifyChoice = { channel: 'site' | 'telegram'; minEdge: number; quiet: boolean }

const ALERT_EDGES = [0.02, 0.03, 0.05] as const

/**
 * How the member wants to hear about new signals, asked after the sample
 * signal so they know what an alert would contain. The chat itself is
 * connected in the profile, which also says it comes with full access.
 */
function NotifyStep({ value, onChange }: { value: NotifyChoice; onChange: (next: NotifyChoice) => void }) {
  const quietId = useId()
  const choices = [
    { channel: 'telegram', name: 'Telegram žinute', note: 'Signalas su kaina, verte ir suma, vos jį randam. Įeina į pilną prieigą.' },
    { channel: 'site', name: 'Pats užsuksiu', note: 'Lenta rodo, kas nauja. Telegram galėsi įjungti vėliau profilyje.' },
  ] as const
  return (
    <div>
      <StepTitle
        title="Kaip sužinosi apie naujus signalus?"
        body="Vertė dažnai trunka valandą ar kelias. Kas nenori jos praleisti, gauna žinutę; kas stato kartą per dieną, užsuka pats."
      />
      <div role="radiogroup" aria-label="Pranešimų būdas" className="mt-10 grid gap-3 sm:grid-cols-2">
        {choices.map((choice) => {
          const checked = value.channel === choice.channel
          return (
            <button
              key={choice.channel}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onChange({ ...value, channel: choice.channel })}
              className={`rounded-2xl bg-stand p-5 text-left transition-[background-color,box-shadow] duration-200 ${
                checked ? 'shadow-[inset_0_0_0_1.5px_var(--chalk)]' : 'hairline hover:bg-stand-hover'
              }`}
            >
              <span className="block text-[1.15rem] font-medium">{choice.name}</span>
              <span className="mt-1 block text-[0.95rem] text-haze">{choice.note}</span>
            </button>
          )
        })}
      </div>

      {value.channel === 'telegram' && (
        <div className="mt-10 space-y-8">
          <Segmented
            label="Siųsti signalus"
            columns="grid-cols-3"
            options={ALERT_EDGES.map((edge) => ({ value: edge, label: `nuo ${percent(edge)}` }))}
            value={value.minEdge}
            onChange={(minEdge) => onChange({ ...value, minEdge })}
          />
          <label htmlFor={quietId} className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-stand p-5 hairline">
            <span>
              <span className="block font-medium">Tyla naktį, 00:00–08:00</span>
              <span className="mt-1 block text-[0.95rem] text-haze">Naktiniai signalai neateina žinute, bet lieka lentoje.</span>
            </span>
            <input
              id={quietId}
              type="checkbox"
              checked={value.quiet}
              onChange={(event) => onChange({ ...value, quiet: event.target.checked })}
              className="size-5 shrink-0 accent-[var(--chalk)]"
            />
          </label>
          <p className="text-[0.95rem] text-haze">
            Toliau atsidarys profilis, kur vienu paspaudimu prijungsi Telegram. Taisykles ten pat pakeisi bet kada.
          </p>
        </div>
      )}
    </div>
  )
}

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
        {/* A hidden copy of the digits sizes the field, so the euro sign sits right after the number. */}
        <span className="inline-grid max-w-full font-display text-[4.5rem] leading-none font-extrabold sm:text-[6rem]">
          <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre">
            {text || '0'}
          </span>
          <input
            id={inputId}
            inputMode="decimal"
            autoComplete="off"
            value={text}
            onChange={(event) => onText(event.target.value.replace(/[^\d\s.,]/g, ''))}
            // size=1 removes the input's built-in ~20-character width, which at this font size filled the row.
            size={1}
            className="col-start-1 row-start-1 w-full min-w-0 bg-transparent outline-none"
          />
        </span>
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
      <div className="mt-8 rounded-xl bg-stand p-4 text-haze hairline">
        <p>
          Signalui su +3 % verte (koef. {formatOdds(EXAMPLE.odds)}) siūlytume{' '}
          <span className="font-semibold text-chalk">{stake > 0 ? formatEuro(stake) : 'mažiau nei 1 €'}</span>.
        </p>
        {/* The second half of the rule: one selection gets one position, so a
            bet already placed on it comes out of the same amount. */}
        <p className="mt-2">
          Jei tą pačią baigtį jau būsi pastatęs{' '}
          <span className="font-semibold text-chalk">{formatEuro(Math.max(1, Math.floor(stake / 2)))}</span> kitoje kontoroje, tam
          pačiam signalui liktų{' '}
          <span className="font-semibold text-chalk">
            {stake - Math.max(1, Math.floor(stake / 2)) > 0
              ? formatEuro(stake - Math.max(1, Math.floor(stake / 2)))
              : 'nieko — riba jau išnaudota'}
          </span>
          . Suma skaičiuojama vienai baigčiai, o ne vienam statymui.
        </p>
      </div>
    </div>
  )
}

function BooksStep({ prefs, update, counts }: StepProps & { counts: SignalCounts | null }) {
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
                <span>
                  <span className="block text-[1.15rem] font-medium">{book}</span>
                  {counts?.perBook[book] !== undefined && (
                    <span className="block text-[0.9rem] text-haze">
                      {formatInteger(counts.perBook[book]!)} {ltPlural(counts.perBook[book]!, 'signalas', 'signalai', 'signalų')} per paskutinę parą
                    </span>
                  )}
                </span>
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
      <SuggestBook />
    </div>
  )
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  columns = 'grid-cols-2 sm:grid-cols-4',
}: {
  columns?: string
  label: string
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <fieldset>
      <legend className="font-medium">{label}</legend>
      <div role="radiogroup" className={`mt-3 grid gap-1.5 rounded-xl bg-stand p-1.5 hairline ${columns}`}>
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
      <div
        role="radiogroup"
        aria-label="Kelly dalis"
        aria-disabled={prefs.fixedStake ? true : undefined}
        className={`mt-10 grid gap-3 transition-opacity ${prefs.fixedStake ? 'opacity-45' : ''}`}
      >
        {KELLY_CHOICES.map((fraction) => {
          const checked = prefs.kellyFraction === fraction
          const stake = suggestedStake({ ...prefs, kellyFraction: fraction, fixedStake: null }, '7BET', EXAMPLE.odds, EXAMPLE.fair)
          return (
            <button
              key={fraction}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => update({ kellyFraction: fraction, fixedStake: null })}
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

      <FixedStakeChoice prefs={prefs} update={update} />

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

/**
 * For members who stake the same amount every time. Picking a Kelly card above
 * switches back; the amount is a draft while typing so clearing it does not.
 */
function FixedStakeChoice({ prefs, update }: StepProps) {
  const id = useId()
  const on = Boolean(prefs.fixedStake)
  const [draft, setDraft] = useState(String(prefs.fixedStake ?? ''))
  const ceiling = Math.floor(prefs.bankroll * STAKE_CEILING)
  return (
    <div className="mt-5 rounded-2xl bg-stand p-5 hairline">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 font-medium">
        <input
          type="checkbox"
          checked={on}
          onChange={(event) => {
            const start = Math.max(1, suggestedStake({ ...prefs, fixedStake: null }, '7BET', EXAMPLE.odds, EXAMPLE.fair))
            if (event.target.checked) setDraft(String(start))
            update({ fixedStake: event.target.checked ? start : null })
          }}
          className="size-5 accent-[var(--floodlight)]"
        />
        Statysiu fiksuotą sumą, ne pagal Kelly
      </label>
      {on && (
        <div className="mt-3">
          <label htmlFor={id} className="text-[0.95rem] text-haze">
            Suma kiekvienam signalui
          </label>
          <div className="relative mt-1.5 max-w-[12rem]">
            <input
              id={id}
              inputMode="numeric"
              value={draft}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, '').slice(0, 6)
                setDraft(digits)
                if (Number(digits) >= 1) update({ fixedStake: Number(digits) })
              }}
              className="h-12 w-full rounded-xl bg-night/60 pr-9 pl-4 font-semibold outline-none hairline focus:shadow-[inset_0_0_0_1.5px_var(--chalk)]"
            />
            <span aria-hidden className="absolute top-1/2 right-4 -translate-y-1/2 text-haze">
              €
            </span>
          </div>
          <p className="mt-2 text-[0.9rem] text-haze">
            Ne daugiau nei 5 % bankrollo ({formatEuro(ceiling)}) ir kontoros limito. Pakeisti galėsi profilyje.
          </p>
        </div>
      )}
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

function PaceStep({ prefs, update }: StepProps) {
  const returns = TRACK_RECORD.returns
  const stake = prefs.fixedStake
    ? Math.max(1, Math.min(prefs.fixedStake, Math.floor(prefs.bankroll * STAKE_CEILING)))
    : simulationStake(prefs.bankroll, prefs.kellyFraction)
  const month = prefs.dailyBets * 30
  const simulation = useMemo(() => simulate({ returns, stake, bets: month, paths: 100, seed: 30, points: 60 }), [returns, stake, month])
  const days = useMemo(() => sampleStretches({ returns, stake, bets: prefs.dailyBets, count: 12, seed: 40 }), [returns, stake, prefs.dailyBets])
  const months = useMemo(() => sampleStretches({ returns, stake, bets: month, count: 12, seed: 41 }), [returns, stake, month])
  const redDays = days.filter((value) => value < 0).length
  const greenMonths = months.filter((value) => value >= 0).length

  return (
    <div>
      <StepTitle
        title="Kiek daugiausia statymų per dieną?"
        body="Tai bus tavo dienos riba: ją pasiekęs, tą dieną sustok. Raudonų dienų bus visada; vertė atsiskleidžia per mėnesius, todėl skubėti nereikia."
      />
      <div role="radiogroup" aria-label="Statymų per dieną" className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PACE_CHOICES.map(({ bets, minutes }) => {
          const checked = prefs.dailyBets === bets
          return (
            <button
              key={bets}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => update({ dailyBets: bets })}
              className={`rounded-2xl bg-stand p-4 text-left transition-[background-color,box-shadow] duration-200 ${
                checked ? 'shadow-[inset_0_0_0_1.5px_var(--chalk)]' : 'hairline hover:bg-stand-hover'
              }`}
            >
              <span className="block font-display text-[2.4rem] leading-none font-bold">{bets}</span>
              <span className="mt-1 block text-[0.9rem] text-haze">per dieną, apie {timeLabel(minutes)}</span>
              <span className="mt-2 block text-[0.8rem] text-haze-dim">
                {formatInteger(1000)} per ~{daysTo(1000, bets)} d.
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-8">
        <Outlook simulation={simulation} title="Tipiškas mėnuo" detail={`${formatInteger(month)} statymų po ${formatEuro(stake)}`} />
      </div>
      <div className="mt-4 grid gap-5 rounded-2xl bg-stand p-5 hairline sm:grid-cols-2">
        <Squares label="Pavyzdys: 12 atsitiktinių dienų" values={days} note={`${redDays} iš 12 minuse`} />
        <Squares label="Pavyzdys: 12 atsitiktinių mėnesių" values={months} note={`${greenMonths} iš 12 pliuse`} />
      </div>
      <div className="mt-8">
        <HardTimes returns={returns} stake={stake} dailyBets={prefs.dailyBets} />
      </div>
      <p className="mt-6 text-[0.85rem] text-haze-dim">
        Scenarijai iš {formatInteger(TRACK_RECORD.bets)} mūsų užbaigtų signalų ({recordPeriodLabel()}, grąža {formatEdge(TRACK_RECORD.roi)}). Tai ne
        prognozė.{' '}
        <Link href="/skaiciuokle" className="underline decoration-rail-strong underline-offset-4 hover:text-chalk">
          Skaičiuoklė
        </Link>
      </p>
    </div>
  )
}

function Squares({ label, values, note }: { label: string; values: number[]; note: string }) {
  return (
    <div>
      <p className="text-[0.85rem] text-haze">{label}</p>
      <ol className="mt-2 grid grid-cols-12 gap-1">
        {values.map((value, index) => (
          <li
            key={index}
            title={signedWhole(value)}
            className="h-6 rounded-[4px]"
            style={{ background: value < 0 ? 'var(--scenario-down)' : 'var(--scenario-up)' }}
          >
            <span className="sr-only">{signedWhole(value)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[0.9rem] font-medium">{note}</p>
    </div>
  )
}
