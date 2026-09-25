import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FeedbackInbox } from '@/components/app/feedback-inbox'
import { OwnerMemberActions } from '@/components/app/owner-member-actions'
import { searchOwnerMembers } from '@/lib/admin-actions'
import { brand } from '@/lib/brand'
import { recentErrors } from '@/lib/error-store'
import { loadHealth } from '@/lib/health'
import { loadFunnel } from '@/lib/onboarding-funnel'
import { kickoffLabel } from '@/lib/live-view'
import { formatEuro, formatInteger } from '@/lib/format-lt'
import { isOwner, ownerMetrics } from '@/lib/owner'
import { getSessionUser } from '@/lib/session'
import { sportName } from '@/lib/sports-lt'

export const metadata: Metadata = {
  title: `Savininkas | ${brand.name}`,
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

const minutes = (value: number | null) =>
  value === null ? '—' : value < 90 ? `${Math.round(value)} min` : `${(value / 60).toLocaleString('lt-LT', { maximumFractionDigits: 1 })} val.`
const share = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)} %` : '—')

/**
 * The owner's dashboard. A 404 for everyone else, so the address gives nothing
 * away. Read-only apart from marking feedback handled.
 */
export default async function OwnerPage() {
  const user = await getSessionUser()
  if (!user || !isOwner(user.email)) notFound()
  const [m, members, errors, health, funnel7, funnel30] = await Promise.all([
    ownerMetrics(),
    searchOwnerMembers(''),
    recentErrors(20),
    loadHealth(),
    loadFunnel(7).catch(() => null),
    loadFunnel(30).catch(() => null),
  ])
  const peak = Math.max(1, ...m.signupsByDay.map((d) => d.count))
  const paying = m.access.active + m.access.ending

  return (
    <main className="mx-auto max-w-[64rem] px-4 pt-6 pb-16 sm:px-8 lg:pt-10">
      <h1 className="text-[2.4rem] sm:text-[3rem]">Savininkas</h1>
      <p className="mt-2 text-haze">Be testinių paskyrų. Atnaujinta atidarius puslapį.</p>

      {/* The same facts the GitHub monitor checks, so a stuck scanner or grader is seen here too. */}
      <p className={`mt-4 rounded-xl px-4 py-3 text-[0.95rem] ${health.ok ? 'bg-pitch-soft text-pitch' : 'bg-[rgb(245_165_36/0.12)] text-warning'}`}>
        {health.problem === 'database'
          ? 'Duomenų bazė neatsako.'
          : `Skeneris: paskutinis ciklas ${health.lastPublishedAt ? kickoffLabel(health.lastPublishedAt) : '—'}. Rezultatai: paskutinis įrašas ${
              health.lastResultAt ? kickoffLabel(health.lastResultAt) : 'dar nė vieno'
            }.`}
        {health.problem === 'stale' && ' Skeneris vėluoja daugiau nei 90 min.'}
        {health.problem === 'results-stale' && ' Rezultatai neatnaujinti daugiau nei parą, nors rungtynės baigėsi.'}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Nariai" value={formatInteger(m.members)} note={`+${m.signups7d} per 7 d., +${m.signups30d} per 30 d.`} />
        <Stat label="Baigė pradžią" value={share(m.onboarded, m.members)} note={`${m.onboarded} iš ${m.members}`} />
        <Stat label="Moka per Stripe" value={formatInteger(m.payingStripe)} note={`MRR ${formatEuro(m.mrrEur)}`} />
        <Stat
          label="Bandymas → mokama"
          value={share(m.trialToPaid.paid, m.trialToPaid.trials)}
          note={`${m.trialToPaid.paid} iš ${m.trialToPaid.trials}; ${m.trialsStarted30d} bandymų per 30 d.`}
        />
      </dl>

      <Section title="Registracijos per 30 dienų">
        {m.signupsByDay.some((d) => d.count > 0) ? (
          <>
            <div className="flex h-36 items-end gap-[2px]" aria-hidden>
              {m.signupsByDay.map((d) => (
                <div key={d.day} className="group relative flex h-full flex-1 items-end">
                  <div className={`w-full ${d.count ? "rounded-t-[4px] bg-floodlight" : "bg-rail"}`} style={{ height: d.count ? `${Math.max(4, (d.count / peak) * 100)}%` : "2px" }} />
                  <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded-md bg-night px-2 py-1 text-[0.8rem] whitespace-nowrap opacity-0 hairline group-hover:opacity-100">
                    {d.day.slice(5)}: {d.count}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[0.8rem] text-haze-dim">
              <span>{m.signupsByDay[0].day.slice(5)}</span>
              <span>daugiausia per dieną: {peak}</span>
              <span>{m.signupsByDay.at(-1)!.day.slice(5)}</span>
            </div>
            <table className="sr-only">
              <caption>Registracijos per dieną</caption>
              <tbody>
                {m.signupsByDay.map((d) => (
                  <tr key={d.day}>
                    <th scope="row">{d.day}</th>
                    <td>{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-haze">Per 30 dienų registracijų nebuvo.</p>
        )}
      </Section>

      <Section title="Prieiga dabar">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Nemokamai" value={formatInteger(m.access.free)} />
          <Stat label="Bandymas" value={formatInteger(m.access.trial)} />
          <Stat label="Moka" value={formatInteger(m.access.active)} />
          <Stat label="Atšaukė, dar galioja" value={formatInteger(m.access.ending)} />
          <Stat label="Baigėsi" value={formatInteger(m.access.expired)} />
        </dl>
        <p className="mt-3 text-[0.9rem] text-haze">
          Pilnos prieigos dabar: {paying + m.access.trial}. Mokančių kiekis įskaito ir rankiniu būdu suteiktą prieigą, MRR — tik Stripe.
        </p>
      </Section>

      <Section title="Nariai ir prieiga">
        <p className="mb-4 text-sm text-haze">Rankinė prieiga nekeičia Stripe prenumeratos. Kiekvienas veiksmas saugomas audito žurnale.</p>
        <OwnerMemberActions initial={members} />
      </Section>

      <Section title="Statymai ir vykdymas">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Statymų per 7 d." value={formatInteger(m.bets7d)} note={`${m.bettingMembers7d} narių`} />
          <Stat label="Signalų su veiksmu, 30 d." value={formatInteger(m.execution.signals)} note={`atidarė ${m.execution.opened}, kopijavo ${m.execution.copied}`} />
          <Stat label="Nuo signalo iki veiksmo" value={minutes(m.execution.medianSeenToActionMin)} note="mediana" />
          <Stat
            label="Nuo veiksmo iki statymo"
            value={minutes(m.execution.medianActionToBetMin)}
            note={`${m.execution.betAfterAction} pastatyta; koef. pokytis ${m.execution.medianOddsSlip === null ? '—' : m.execution.medianOddsSlip.toLocaleString('lt-LT')}`}
          />
        </dl>
      </Section>

      <Section title="Kur nubyra pradžioje">
        {funnel30 && funnel7 && funnel30[0].reached > 0 ? (
          <table className="w-full text-left text-[0.95rem]">
            <thead className="text-[0.85rem] text-haze">
              <tr>
                <th className="py-2 font-medium">Žingsnis</th>
                <th className="py-2 text-right font-medium">7 d.</th>
                <th className="py-2 text-right font-medium">30 d.</th>
                <th className="py-2 text-right font-medium">Nuo pradžios</th>
              </tr>
            </thead>
            <tbody>
              {funnel30.map((row, index) => (
                <tr key={row.step} className="border-t border-rail">
                  <td className="py-2.5 font-medium">{row.name}</td>
                  <td className="py-2.5 text-right tnum">{funnel7[index].reached}</td>
                  <td className="py-2.5 text-right tnum">{row.reached}</td>
                  <td className="py-2.5 text-right text-haze tnum">{share(row.reached, funnel30[0].reached)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-haze">Dar niekas nepradėjo pradžios žingsnių (skaičiuojama nuo 2026-09-26).</p>
        )}
        <p className="mt-3 text-[0.85rem] text-haze-dim">Naršyklės, pasiekusios žingsnį. Anonimiškai, be paskyros; saugoma 90 dienų.</p>
      </Section>

      <Section title="Prašomos kontoros">
        {m.bookRequests.length ? (
          <table className="w-full text-left text-[0.95rem]">
            <thead className="text-[0.85rem] text-haze">
              <tr>
                <th className="py-2 font-medium">Kontora</th>
                <th className="py-2 font-medium">Narių</th>
                <th className="hidden py-2 font-medium sm:table-cell">Sportai</th>
                <th className="py-2 text-right font-medium">Paskutinis</th>
              </tr>
            </thead>
            <tbody>
              {m.bookRequests.map((row) => (
                <tr key={row.name} className="border-t border-rail">
                  <td className="py-2.5 font-medium">{row.name}</td>
                  <td className="py-2.5 tnum">{row.members}</td>
                  <td className="hidden py-2.5 text-haze sm:table-cell">{row.sports.map(sportName).join(', ') || '—'}</td>
                  <td className="py-2.5 text-right text-haze tnum">{row.lastAt.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-haze">Dar niekas neprašė kitos kontoros.</p>
        )}
      </Section>

      <Section title="Žinutės iš pagalbos">
        <FeedbackInbox initial={m.feedback} />
      </Section>

      <Section title="Klaidos">
        {errors.length ? (
          <ul className="grid gap-3">
            {errors.map((error) => (
              <li key={error.fingerprint} className="rounded-xl bg-night/60 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="min-w-0 font-medium break-words">{error.message}</p>
                  <p className="shrink-0 text-[0.85rem] text-haze tnum">
                    {error.count}× · paskutinė {kickoffLabel(error.lastAt)}
                  </p>
                </div>
                <p className="mt-1 text-[0.85rem] text-haze-dim">
                  {error.source === 'client' ? 'Naršyklė' : 'Serveris'} · {error.kind} · {error.where ?? '—'} · {error.release}
                </p>
                {error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[0.85rem] text-haze">Stack</summary>
                    <pre className="mt-2 overflow-x-auto text-[0.75rem] text-haze">{error.stack}</pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-haze">Per 30 dienų klaidų neužfiksuota.</p>
        )}
      </Section>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl bg-stand p-5 hairline sm:p-7">
      <h2 className="mb-5 text-[1.6rem]">{title}</h2>
      {children}
    </section>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl bg-night/60 p-4">
      <dt className="text-[0.85rem] text-haze">{label}</dt>
      <dd className="mt-1 font-display text-[1.8rem] leading-none font-bold tnum">{value}</dd>
      {note && <dd className="mt-1.5 text-[0.8rem] text-haze-dim">{note}</dd>}
    </div>
  )
}
