import { edgeOf, formatEdge, formatOdds } from '@/lib/format-lt'
import { landingSignals } from '@/lib/landing-signals'
import { Reveal } from './motion-primitives'

// Real captured signals: one with all three books priced, one Betsson total for the alert.
const scan = landingSignals.find((signal) => signal.id === 'breogan-rilski-hcp-home')!
const alert = landingSignals.find((signal) => signal.id === 'vef-absheron-total-171')!
const alertPrice = alert.prices.find((price) => price.book === alert.valueBook)!

const CARD = 'flex h-full min-w-0 flex-col rounded-[20px] bg-stand p-6 shadow-[inset_0_0_0_1px_var(--rail)]'

export function Journey() {
  const rows = [...scan.prices].sort((a, b) => b.odds - a.odds)
  const previous = scan.prices.find((price) => price.book === scan.valueBook)!

  return (
    <section className="bg-night-alt px-5 py-[clamp(80px,10vw,160px)] sm:px-8">
      <div className="mx-auto max-w-[80rem]">
        <Reveal>
          <h2 className="text-[clamp(2.25rem,4.5vw,4rem)] leading-[0.95]">Nuo kainos iki statymo</h2>
        </Reveal>
        <Reveal delay={80}>
          <p className="mt-5 max-w-[62ch] text-[clamp(1.05rem,1.4vw,1.25rem)] text-haze">
            Skenuojam maždaug kas 30 minučių. Tikro laiko nežadam: jei kaina pasikeitė, signalas pažymimas kaip užsidaręs.
          </p>
        </Reveal>

        <ol className="mt-[clamp(40px,5vw,72px)] grid gap-5 lg:grid-cols-3">
          <li>
            <Reveal variant="scale" className={CARD}>
              <p className="font-display text-[0.9375rem] font-bold text-haze">01</p>
              <h3 className="mt-2.5 text-[clamp(1.375rem,2vw,1.75rem)] tracking-[-0.02em]">Skenuojam kainas</h3>
              <p className="mt-2.5 mb-5 text-[0.9375rem] text-haze">
                Trys kontoros prieš Pinnacle kainą be maržos, visose rungtynėse, kurias jos pačios siūlo.
              </p>
              <div className="relative mt-auto grid gap-2 overflow-hidden rounded-[14px] bg-night p-3">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 h-8 animate-[kr-scan_4.8s_cubic-bezier(.45,0,.55,1)_infinite] bg-[linear-gradient(180deg,transparent,rgb(91_229_132/0.14),transparent)]"
                />
                <p className="truncate text-[0.8125rem] text-haze">
                  {scan.market}: {scan.prices[0].selection}
                </p>
                {rows.map((price) => (
                  <div key={price.book} className="flex justify-between gap-2.5 text-[0.875rem]">
                    <span className="text-haze">{price.book}</span>
                    <span className={`font-semibold tnum ${price.odds > scan.fairOdds ? 'text-floodlight' : 'text-chalk'}`}>{formatOdds(price.odds)}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-2.5 border-t border-rail pt-2 text-[0.875rem]">
                  <span className="text-haze">Tikroji kaina</span>
                  <span className="text-haze tnum">{formatOdds(scan.fairOdds)}</span>
                </div>
              </div>
            </Reveal>
          </li>

          <li>
            <Reveal variant="scale" delay={60} className={CARD}>
              <p className="font-display text-[0.9375rem] font-bold text-haze">02</p>
              <h3 className="mt-2.5 text-[clamp(1.375rem,2vw,1.75rem)] tracking-[-0.02em]">Signalas į Telegram</h3>
              <p className="mt-2.5 mb-5 text-[0.9375rem] text-haze">
                Rungtynės, kontora, koeficientas, vertė ir suma. Pavadinimas toks, kokį rašo ta kontora.
              </p>
              <div className="relative mt-auto grid gap-2">
                <div className="animate-[kr-tg-prev_7s_cubic-bezier(.22,1,.36,1)_infinite] rounded-[14px] bg-night px-3.5 py-3 text-[0.875rem] text-haze">
                  {previous.event}, {previous.book} {formatOdds(previous.odds)}
                </div>
                <div aria-hidden className="flex h-2 items-center gap-[5px] px-1.5">
                  {[0, 0.16, 0.32].map((delay) => (
                    <span key={delay} className="size-[5px] animate-[kr-dots_1.3s_ease-in-out_infinite] rounded-full bg-rail-strong" style={{ animationDelay: `${delay}s` }} />
                  ))}
                </div>
                <div className="animate-[kr-tg_7s_cubic-bezier(.22,1,.36,1)_infinite] rounded-[14px] bg-stand-hover p-3.5 shadow-[inset_0_0_0_1px_var(--rail)]">
                  <p className="text-[0.875rem]">{alertPrice.event}</p>
                  <p className="mt-1 text-[0.8125rem] text-haze">
                    {alert.market}: {alertPrice.selection}
                  </p>
                  <div className="mt-2.5 flex items-baseline justify-between gap-2.5">
                    <span className="font-display text-[1.25rem] font-bold tnum">
                      {alertPrice.book} {formatOdds(alertPrice.odds)}
                    </span>
                    <span className="text-[0.9375rem] font-semibold text-floodlight tnum">{formatEdge(edgeOf(alertPrice.odds, alert.fairOdds))}</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </li>

          <li>
            <Reveal variant="scale" delay={120} className={CARD}>
              <p className="font-display text-[0.9375rem] font-bold text-haze">03</p>
              <h3 className="mt-2.5 text-[clamp(1.375rem,2vw,1.75rem)] tracking-[-0.02em]">Pastatai ir sekam</h3>
              <p className="mt-2.5 mb-5 text-[0.9375rem] text-haze">
                Statymas įrašomas su tavo kaina. Rezultatą ir uždarymo kainą užpildom automatiškai.
              </p>
              <div className="mt-auto grid gap-2.5 rounded-[14px] bg-night p-3.5 text-[0.875rem]">
                <div className="flex justify-between gap-2.5 text-haze">
                  <span>Suma</span>
                  <span className="font-semibold text-chalk tnum">7,50 €</span>
                </div>
                <div className="flex justify-between gap-2.5 text-haze">
                  <span>Galimas laimėjimas</span>
                  <span className="font-semibold text-chalk tnum">14,63 €</span>
                </div>
                <div className="h-px bg-rail" />
                <div className="flex items-center justify-between gap-2.5 text-haze">
                  <span>Būsena</span>
                  <span className="relative inline-grid">
                    {/* The two pills stack in one cell, so each needs a solid ground of its own. */}
                    <span className="col-start-1 row-start-1 animate-[kr-swap-a_6s_ease-in-out_infinite] rounded-full bg-rail px-2.5 py-1 text-[0.8125rem] font-medium text-chalk">
                      Laukia
                    </span>
                    <span className="col-start-1 row-start-1 animate-[kr-swap-b_6s_ease-in-out_infinite] rounded-full bg-floodlight px-2.5 py-1 text-[0.8125rem] font-semibold text-night">
                      Laimėta
                    </span>
                  </span>
                </div>
                <div className="flex justify-between gap-2.5 text-haze">
                  <span>CLV</span>
                  <span className="font-semibold text-floodlight tnum">+4,1 %</span>
                </div>
              </div>
            </Reveal>
          </li>
        </ol>
      </div>
    </section>
  )
}
