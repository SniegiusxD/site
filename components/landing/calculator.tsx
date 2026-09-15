'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import { useId, useMemo, useState } from 'react'
import { HardTimes } from '@/components/app/hard-times'
import { Outlook } from '@/components/app/outlook'
import { BookMark } from '@/components/landing/book-mark'
import { formatEdge, formatEuro, formatInteger, ltPlural } from '@/lib/format-lt'
import { BOOKS, type BookName } from '@/lib/landing-signals'
import { PACE_CHOICES, TRACK_RECORD, daysTo, recordPeriodLabel, simulationStake, timeLabel } from '@/lib/pace'
import type { SignalCounts } from '@/lib/signal-counts'
import { simulate } from '@/lib/simulate'

const EASE = [0.22, 1, 0.36, 1] as const
const PRESETS = [250, 500, 1000, 2500]
const QUESTIONS = 3
const BETS = 1000

export function Calculator({ counts }: { counts: SignalCounts | null }) {
  const reduced = useReducedMotion()
  const bankrollId = useId()
  const [step, setStep] = useState(0)
  const [books, setBooks] = useState<BookName[]>([...BOOKS])
  const [bankrollText, setBankrollText] = useState('500')
  const [dailyBets, setDailyBets] = useState(10)

  const bankroll = Number(bankrollText.replace(/\s/g, '').replace(',', '.')) || 0
  const stake = simulationStake(bankroll, 0.25)
  const valid = step === 0 ? books.length > 0 : step === 1 ? bankroll >= 10 && bankroll <= 1_000_000 : true
  const simulation = useMemo(
    () => simulate({ returns: TRACK_RECORD.returns, stake, bets: BETS, paths: 100, seed: 1000, points: 80 }),
    [stake],
  )
  const days = daysTo(BETS, dailyBets)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (valid) setStep((current) => current + 1)
  }

  const toggle = (book: BookName) =>
    setBooks((current) => (current.includes(book) ? current.filter((b) => b !== book) : BOOKS.filter((b) => b === book || current.includes(b))))

  if (step >= QUESTIONS) {
    return (
      <div className="mx-auto max-w-[72rem] px-5 pt-10 pb-20 sm:px-8 lg:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[2.6rem] leading-[0.95] sm:text-[3.6rem]">Tavo {formatInteger(BETS)} statymų</h1>
            <p className="mt-3 max-w-[40rem] text-haze">
              100 scenarijų, kiekviename {formatInteger(BETS)} statymų po {formatEuro(stake)}. Kiekvienas statymas paimtas iš mūsų tikrų
              užbaigtų signalų.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStep(0)}
            className="rounded-xl bg-stand px-4 py-2.5 font-medium hairline transition-colors hover:bg-stand-hover"
          >
            Keisti atsakymus
          </button>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:items-start">
          <Outlook
            simulation={simulation}
            title={`Tipiškas rezultatas po ${formatInteger(BETS)} statymų`}
            detail={`po ${formatEuro(stake)} kiekvienas: ¼ Kelly nuo ${formatEuro(bankroll)} bankrollo`}
          />
          <div className="space-y-4">
            <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-rail lg:grid-cols-1">
              <Fact label="statymų per dieną" value={String(dailyBets)} />
              <Fact label={`iki ${formatInteger(BETS)} statymų`} value={`~${days} d.`} />
              <Fact label="per dieną" value={`~${timeLabel(dailyBets * 3)}`} />
            </dl>
            <div className="rounded-2xl bg-chalk p-5 text-night sm:p-6">
              <p className="font-display text-[1.9rem] leading-none font-bold">Nori matyti tikrus signalus?</p>
              <p className="mt-2 text-[0.95rem] text-night/75">
                Pirmos 7 dienos nemokamos. Visų kontorų kainos, siūloma suma ir statymų sekimas.
              </p>
              <Link
                href="/registracija"
                className="mt-4 flex h-12 items-center justify-center rounded-xl bg-night font-semibold text-chalk transition-transform hover:bg-stand active:scale-[0.98]"
              >
                Išbandyti nemokamai
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <HardTimes returns={TRACK_RECORD.returns} stake={stake} dailyBets={dailyBets} />
        </div>

        <Method />
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-[72rem] gap-10 px-5 pt-10 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:pt-16">
      <div>
        <h1 className="text-[2.8rem] leading-[0.95] sm:text-[4.2rem]">Pamatyk, kaip atrodo {formatInteger(BETS)} statymų</h1>
        <p className="mt-4 max-w-[30rem] text-haze">
          Trys klausimai, tada 100 scenarijų iš mūsų tikrų užbaigtų signalų. Be pažadų: blogi scenarijai rodomi taip pat.
        </p>
        <dl className="mt-8 space-y-3 text-[0.95rem]">
          <div>
            <dt className="inline font-semibold">
              {formatInteger(TRACK_RECORD.bets)} {ltPlural(TRACK_RECORD.bets, 'užbaigtas signalas', 'užbaigti signalai', 'užbaigtų signalų')}
            </dt>{' '}
            <dd className="inline text-haze">
              {recordPeriodLabel()}, grąža {formatEdge(TRACK_RECORD.roi)}, vid. koeficientas {TRACK_RECORD.averageOdds.toFixed(2).replace('.', ',')}
            </dd>
          </div>
          {counts && (
            <div>
              <dt className="inline font-semibold">
                {formatInteger(counts.any)} {ltPlural(counts.any, 'signalas', 'signalai', 'signalų')}
              </dt>{' '}
              <dd className="inline text-haze">per paskutinę parą</dd>
            </div>
          )}
        </dl>
      </div>

      <form onSubmit={submit} className="rounded-3xl bg-stand p-5 hairline sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[0.9rem] text-haze">
            Klausimas {step + 1} iš {QUESTIONS}
          </p>
          <div className="flex w-24 gap-1" aria-hidden>
            {Array.from({ length: QUESTIONS }, (_, index) => (
              <span key={index} className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-chalk' : 'bg-rail'}`} />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="mt-5"
          >
            {step === 0 && (
              <fieldset>
                <legend className="font-display text-[2rem] leading-none font-bold">Kokiose kontorose turi paskyras?</legend>
                <div className="mt-5 grid gap-2.5">
                  {BOOKS.map((book) => {
                    const on = books.includes(book)
                    const perDay = counts?.perBook[book]
                    return (
                      <button
                        key={book}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(book)}
                        className={`flex items-center justify-between gap-4 rounded-2xl bg-night/60 p-4 text-left transition-shadow ${on ? 'shadow-[inset_0_0_0_1.5px_var(--chalk)]' : 'hairline'}`}
                      >
                        <span className="flex items-center gap-3">
                          <BookMark book={book} />
                          <span>
                            <span className="block font-medium">{book}</span>
                            {perDay !== undefined && (
                              <span className="block text-[0.85rem] text-haze">
                                {formatInteger(perDay)} {ltPlural(perDay, 'signalas', 'signalai', 'signalų')} per parą
                              </span>
                            )}
                          </span>
                        </span>
                        <span className={`grid size-6 place-items-center rounded-full ${on ? 'bg-chalk text-night' : 'bg-rail text-transparent'}`}>
                          <Check className="size-3.5" aria-hidden />
                        </span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            )}

            {step === 1 && (
              <div>
                <label htmlFor={bankrollId} className="block font-display text-[2rem] leading-none font-bold">
                  Su kokiu bankrollu pradėtum?
                </label>
                <p className="mt-2 text-[0.95rem] text-haze">Tik tiek, kiek gali sau leisti prarasti. 18+.</p>
                <div className="mt-5 flex items-baseline gap-2 border-b-2 border-rail pb-2 focus-within:border-chalk">
                  <input
                    id={bankrollId}
                    inputMode="decimal"
                    autoComplete="off"
                    value={bankrollText}
                    onChange={(event) => setBankrollText(event.target.value.replace(/[^\d\s.,]/g, ''))}
                    className="w-full min-w-0 bg-transparent font-display text-[3.6rem] leading-none font-extrabold outline-none"
                  />
                  <span className="font-display text-4xl font-extrabold text-haze">€</span>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {PRESETS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBankrollText(String(value))}
                      className={`rounded-lg py-2 text-[0.95rem] font-medium transition-colors ${bankroll === value ? 'bg-chalk text-night' : 'bg-rail text-haze hover:text-chalk'}`}
                    >
                      {formatEuro(value)}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-[0.95rem] text-haze">
                  {bankroll >= 10 ? (
                    <>
                      Vienas statymas apie <span className="font-semibold text-chalk">{formatEuro(stake)}</span> (¼ Kelly).
                    </>
                  ) : (
                    'Įrašyk bent 10 €.'
                  )}
                </p>
              </div>
            )}

            {step === 2 && (
              <fieldset>
                <legend className="font-display text-[2rem] leading-none font-bold">Kiek laiko turi per dieną?</legend>
                <p className="mt-2 text-[0.95rem] text-haze">Vienam statymui reikia apie 3 minučių: rasti, pastatyti, pažymėti.</p>
                <div role="radiogroup" className="mt-5 grid gap-2.5">
                  {PACE_CHOICES.map(({ bets, minutes }) => {
                    const on = dailyBets === bets
                    return (
                      <button
                        key={bets}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setDailyBets(bets)}
                        className={`flex items-center justify-between gap-4 rounded-2xl bg-night/60 p-4 text-left transition-shadow ${on ? 'shadow-[inset_0_0_0_1.5px_var(--chalk)]' : 'hairline'}`}
                      >
                        <span>
                          <span className="block font-medium">Apie {timeLabel(minutes)}</span>
                          <span className="block text-[0.85rem] text-haze">
                            {bets} statymų per dieną, {formatInteger(BETS)} per ~{daysTo(BETS, bets)} d.
                          </span>
                        </span>
                        <span className={`grid size-6 place-items-center rounded-full ${on ? 'bg-chalk text-night' : 'bg-rail text-transparent'}`}>
                          <Check className="size-3.5" aria-hidden />
                        </span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            )}
          </motion.div>
        </AnimatePresence>

        {!valid && step === 0 && <p className="mt-4 text-[0.95rem] text-brick">Pasirink bent vieną kontorą.</p>}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-rail pt-5">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-haze transition-colors hover:text-chalk ${step === 0 ? 'invisible' : ''}`}
          >
            <ArrowLeft className="size-5" aria-hidden />
            Atgal
          </button>
          <button
            type="submit"
            disabled={!valid}
            className="rounded-xl bg-chalk px-6 py-3 font-semibold text-night transition-transform hover:bg-white active:scale-[0.97] disabled:opacity-50"
          >
            {step === QUESTIONS - 1 ? 'Rodyti 100 scenarijų' : 'Toliau'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-stand p-4">
      <dt className="sr-only">{label}</dt>
      <dd className="font-display text-[1.9rem] leading-none font-bold">{value}</dd>
      <dd aria-hidden className="mt-1 text-[0.85rem] text-haze">
        {label}
      </dd>
    </div>
  )
}

function Method() {
  return (
    <section aria-labelledby="method-title" className="mt-10 max-w-[48rem]">
      <h2 id="method-title" className="text-[1.6rem]">
        Kaip skaičiuojam
      </h2>
      <div className="mt-3 space-y-3 text-haze">
        <p>
          100 kartų „sužaidžiam“ {formatInteger(BETS)} statymų ta pačia suma. Kiekvienas statymas atsitiktinai ištraukiamas iš{' '}
          {formatInteger(TRACK_RECORD.bets)} mūsų užbaigtų signalų ({recordPeriodLabel()}) su tikrais koeficientais ir tikrais rezultatais:
          laimėta {formatInteger(TRACK_RECORD.won)}, pralaimėta {formatInteger(TRACK_RECORD.lost)}, grąžinta {formatInteger(TRACK_RECORD.pushed)}.
        </p>
        <p>
          Suma yra ¼ Kelly nuo tavo bankrollo tipiniam mūsų signalui. Tikroje programėlėje suma kinta pagal kiekvieno signalo vertę ir
          kontoros limitą.
        </p>
        <p>
          Istorija dar trumpa, o kelios tų pačių rungtynių linijos dažnai laimi arba pralaimi kartu, todėl tikras svyravimas gali būti
          didesnis nei čia. Tai ne prognozė ir ne pažadas uždirbti.
        </p>
      </div>
    </section>
  )
}
