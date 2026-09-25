import type { Metadata } from 'next'
import Link from 'next/link'
import { ClvDays } from '@/components/landing/clv-days'
import { ClvTrust } from '@/components/landing/clv-trust'
import { Roll } from '@/components/landing/motion-primitives'
import { type ResultRow, ResultsList } from '@/components/landing/results-list'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'
import { vilniusDay } from '@/lib/bets-calendar'
import { brand } from '@/lib/brand'
import { trustLabel } from '@/lib/close-evidence'
import { loadCloseEvidence } from '@/lib/close-evidence-store'
import { formatEdge, formatInteger, formatPercent } from '@/lib/format-lt'
import { BOOKS } from '@/lib/landing-signals'
import { kickoffLabel } from '@/lib/live-view'
import { clvByDay, clvOf, outcomeText, type PastSignal, selectionText, summarize, summarizeByBook } from '@/lib/public-results'
import { loadPastSignals, RESULTS_WINDOW_DAYS } from '@/lib/public-results-store'
import { sportName } from '@/lib/sports-lt'

export const metadata: Metadata = {
  title: `Rezultatai: kiekvienas signalas prieš uždarymo kainą | ${brand.name}`,
  description:
    'Visi paskelbti signalai per paskutines 30 dienų, palyginti su Pinnacle uždarymo kaina. Nieko nerenkame ir netriname.',
  alternates: { canonical: '/rezultatai' },
}

// Reads the database; rebuilt at most every 10 minutes.
export const revalidate = 600

/** Below this many closes a book's rates are shown but called a small sample. */
const SMALL_SAMPLE = 50
/** Returns are only shown once this many signals are graded; fewer is noise. */
const MIN_GRADED_FOR_RETURN = 100
/** The list ships this many rows; the summary uses all of them. */
const LIST_ROWS = 400

const TONE: Record<NonNullable<PastSignal['outcome']>, ResultRow['tone']> = {
  won: 1,
  half_won: 1,
  push: 0,
  void: 0,
  half_lost: -1,
  lost: -1,
}

function toRow(signal: PastSignal): ResultRow {
  return {
    id: signal.id,
    when: kickoffLabel(signal.startsAt),
    sport: sportName(signal.sport),
    event: signal.home && signal.away ? `${signal.home} – ${signal.away}` : signal.home || signal.away || '—',
    pick: selectionText(signal),
    book: signal.book,
    odds: signal.odds,
    clv: clvOf(signal),
    outcome: outcomeText(signal.outcome),
    tone: signal.outcome ? TONE[signal.outcome] : null,
  }
}

const FIGURE = 'font-display text-[clamp(2.6rem,7vw,4.2rem)] leading-none tabular-nums text-chalk'

/** The one moment of motion on the page: the three numbers roll up once, when seen. */
function Figure({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <p className={FIGURE}>{value}</p>
      <p className="mt-2 max-w-[14rem] text-[0.95rem] text-haze">{label}</p>
    </div>
  )
}

export default async function ResultsPage() {
  const [loaded, closeEvidence] = await Promise.all([loadPastSignals(), loadCloseEvidence()])
  const signals = loaded ?? []
  const total = summarize(signals)
  const byBook = summarizeByBook(signals, BOOKS)
  const showReturn = total.graded >= MIN_GRADED_FOR_RETURN

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[64rem] px-5 pt-32 pb-24 sm:px-8 lg:pt-40">
        <h1 className="text-[3rem] sm:text-[4rem]">Rezultatai</h1>
        <p className="mt-4 max-w-[40rem] text-[1.1rem] text-haze">
          Kiekvienas signalas, kurį paskelbėme per paskutines {RESULTS_WINDOW_DAYS} dienų ir kurio rungtynės jau prasidėjo,
          palygintas su Pinnacle uždarymo kaina. Nieko nerenkame ir netriname.
        </p>

        {loaded === null ? (
          <p className="mt-12 rounded-2xl bg-stand p-6 text-haze hairline">
            Duomenų dabar nepavyko įkelti. Puslapis atsinaujina kas 10 minučių, pabandyk vėliau.
          </p>
        ) : total.withClose === 0 ? (
          <p className="mt-12 rounded-2xl bg-stand p-6 text-haze hairline">
            Dar nėra signalų su užfiksuota uždarymo kaina. Jie atsiras, kai prasidės pirmosios paskelbtų signalų rungtynės.
          </p>
        ) : (
          <>
            <section aria-label="Santrauka" className="mt-14 grid gap-10 sm:grid-cols-3">
              <Figure
                value={<Roll value={Math.round((total.beatClose ?? 0) * 100)} suffix={' %'} />}
                label="signalų kaina buvo geresnė už uždarymo kainą"
              />
              <Figure
                value={<Roll value={(total.meanClv ?? 0) * 100} decimals={1} signed suffix={' %'} />}
                label="vidutinis CLV: kiek kaina buvo geresnė už uždarymą"
              />
              <Figure
                value={<Roll value={total.withClose} />}
                label={`signalų su užfiksuota uždarymo kaina iš ${formatInteger(total.signals)} prasidėjusių`}
              />
            </section>
            <ClvTrust label={trustLabel(closeEvidence)} className="mt-8" />

            <section aria-labelledby="kas-diena" className="mt-16">
              <h2 id="kas-diena" className="text-[1.9rem] leading-tight">
                Kas dieną
              </h2>
              <p className="mt-2 mb-6 max-w-[40rem] text-haze">
                Vienos geros dienos negana. Stulpelis — tos dienos rungtynių vidutinis CLV: žalias virš linijos, raudonas po ja.
              </p>
              <ClvDays days={clvByDay(signals, vilniusDay)} />
            </section>

            <section aria-labelledby="pagal-kontora" className="mt-16">
              <h2 id="pagal-kontora" className="text-[1.9rem] leading-tight">
                Pagal kontorą
              </h2>
              <p className="mt-2 max-w-[40rem] text-haze">
                Juosta rodo, kiek signalų aplenkė uždarymo kainą. Brūkšnys — 50 %: tiek būtų atsitiktinai.
              </p>
              <ul className="mt-6 grid gap-3">
                {byBook.map((row) => {
                  const share = row.beatClose ?? 0
                  return (
                    <li key={row.book} className="rounded-2xl bg-stand p-5 hairline">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                        <p className="font-medium text-chalk">{row.book}</p>
                        <p className="text-[0.95rem] text-haze">
                          <span className="tabular-nums text-chalk">{formatPercent(share, 0)}</span> aplenkė ·{' '}
                          <span className="tabular-nums text-chalk">{formatEdge(row.meanClv ?? 0)}</span> vid. CLV ·{' '}
                          {formatInteger(row.withClose)} su uždarymu
                          {row.withClose < SMALL_SAMPLE && <span className="text-warning"> · maža imtis</span>}
                        </p>
                      </div>
                      <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-rail" aria-hidden>
                        <div
                          className={`h-full origin-left rounded-full ${share > 0.5 ? 'bg-pitch' : 'bg-steel'}`}
                          style={{ transform: `scaleX(${share})` }}
                        />
                        <div className="absolute inset-y-0 left-1/2 w-px bg-chalk/70" />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>

            <section aria-labelledby="laimejimai" className="mt-16">
              <h2 id="laimejimai" className="text-[1.9rem] leading-tight">
                Laimėjimai ir pralaimėjimai
              </h2>
              {showReturn ? (
                <p className="mt-3 max-w-[40rem] text-haze">
                  Įvertinta {formatInteger(total.graded)}: laimėta {formatInteger(total.won)}, pralaimėta{' '}
                  {formatInteger(total.lost)}, grąžinta ar anuliuota {formatInteger(total.other)}. Statant po vienodą sumą, grąža
                  būtų <span className="text-chalk">{formatEdge(total.roi ?? 0)}</span> nuo pastatytos sumos
                  {total.roiLow !== null && total.roiHigh !== null
                    ? ` (95 % tikimybe tikroji reikšmė tarp ${formatEdge(total.roiLow)} ir ${formatEdge(total.roiHigh)})`
                    : ''}
                  . Tai praeitis, ne pažadas: per kelis šimtus statymų rezultatas stipriai svyruoja, todėl patikimesnis rodiklis yra
                  CLV.
                </p>
              ) : (
                <p className="mt-3 max-w-[40rem] text-haze">
                  Įvertinta {formatInteger(total.graded)}. Grąžą parodysime, kai bus bent {MIN_GRADED_FOR_RETURN} įvertintų
                  signalų: mažesnė imtis daugiau pasako apie sėkmę nei apie metodą. Iki tol geriau žiūrėti į CLV — jis matomas
                  iškart po rungtynių pradžios.
                </p>
              )}
            </section>

            <section aria-labelledby="visi-signalai" className="mt-16">
              <h2 id="visi-signalai" className="mb-5 text-[1.9rem] leading-tight">
                Visi signalai
              </h2>
              <ResultsList rows={signals.slice(0, LIST_ROWS).map(toRow)} books={byBook.map((row) => row.book)} />
              {signals.length > LIST_ROWS && (
                <p className="mt-3 text-[0.9rem] text-haze">
                  Sąraše naujausi {LIST_ROWS}; santrauka skaičiuota iš visų {formatInteger(signals.length)}.
                </p>
              )}
            </section>
          </>
        )}

        <section aria-labelledby="kaip-skaiciuojama" className="mt-20 max-w-[44rem] text-haze">
          <h2 id="kaip-skaiciuojama" className="text-[1.9rem] leading-tight text-chalk">
            Kaip skaičiuojama
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            <li>
              <span className="text-chalk">Kaina</span> — paskutinis kontoros koeficientas, kurį matėme prieš signalui
              užsidarant. Kaina paskelbimo metu dažnai būna geresnė, tad šis skaičiavimas atsargus.
            </li>
            <li>
              <span className="text-chalk">Uždarymo kaina</span> — Pinnacle tikimybė be maržos prieš pat rungtynių pradžią.
              Jei jos neužfiksavome, rašome „nėra“ ir signalo į CLV nesiskaičiuojame.
            </li>
            <li>
              <span className="text-chalk">CLV</span> = kaina × uždarymo tikimybė − 1. Teigiamas CLV reiškia, kad statėme
              geresne kaina, nei rinka galiausiai sutarė.{' '}
              <Link href="/gidai/kas-yra-clv" className="text-chalk underline decoration-rail-strong underline-offset-4">
                Kodėl tai svarbiau už pelną
              </Link>
            </li>
            <li>Kiekvienas signalas skaičiuojamas atskirai, net jei vienose rungtynėse jų buvo keli.</li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
