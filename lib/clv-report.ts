import { marketFamilyOf, summarize, summarizeBy, type PastSignal, type ResultSummary } from '@/lib/public-results'

/**
 * The owner's CLV report: sport × book × market over the record, as markdown.
 * It replaces the hand-made tables of CLV_BY_SPORT_MARKET_2026-09-25.md, so
 * decisions about thin markets or stale books rest on the live sample, and it
 * says plainly when a cell is too small to act on.
 */

export const ACT_ON = 30
const SHOW_CELL = 6

const pct = (value: number | null, digits = 1) =>
  value === null ? '—' : `${value >= 0 && digits > 0 ? '+' : ''}${(value * 100).toFixed(digits).replace('.', ',').replace('-', '−')} %`
const share = (value: number | null) => (value === null ? '—' : `${Math.round(value * 100)} %`)

/** A cell to look at: enough closes to mean something, and losing to the close. */
export function isWeak(row: Pick<ResultSummary, 'withClose' | 'meanClv' | 'beatClose'>): boolean {
  return row.withClose >= 10 && ((row.meanClv ?? 0) < 0 || (row.beatClose ?? 1) < 0.6)
}

function table(rows: Array<{ key: string } & ResultSummary>, label: string): string[] {
  return [
    `| ${label} | closes | beat | CLV | won–lost |`,
    '|---|---|---|---|---|',
    ...rows.map(
      (row) =>
        `| ${row.key} | ${row.withClose}${row.withClose < ACT_ON ? ' (small)' : ''} | ${share(row.beatClose)} | ${pct(row.meanClv)} | ${row.won}–${row.lost} |`,
    ),
  ]
}

export function renderClvReport(signals: PastSignal[], now: Date): string {
  const all = summarize(signals)
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000
  const lastWeek = summarize(signals.filter((signal) => new Date(signal.startsAt).getTime() >= weekAgo))
  const cells = summarizeBy(signals, (s) => `${s.sport} · ${s.book} · ${marketFamilyOf(s.market)}`, SHOW_CELL).filter(
    (row) => row.withClose >= SHOW_CELL,
  )
  const weak = cells.filter(isWeak).sort((a, b) => (a.meanClv ?? 0) - (b.meanClv ?? 0))
  const strong = cells
    .filter((row) => row.withClose >= 20 && (row.meanClv ?? 0) > 0 && (row.beatClose ?? 0) >= 0.75)
    .sort((a, b) => (b.meanClv ?? 0) - (a.meanClv ?? 0))

  const lines = [
    `# CLV report — ${now.toISOString().slice(0, 10)}`,
    '',
    `Every published signal whose match started in the last 30 days (${all.signals}; ${all.withClose} with a close,`,
    `${all.graded} graded). A cell with fewer than ${ACT_ON} closes is marked "small": a lead to check, not a reason to act.`,
    '',
    `- **All:** beat the close ${share(all.beatClose)}, mean CLV ${pct(all.meanClv)}, won–lost ${all.won}–${all.lost}.`,
    `- **Last 7 days:** beat the close ${share(lastWeek.beatClose)}, mean CLV ${pct(lastWeek.meanClv)} (${lastWeek.withClose} closes).`,
    '',
    '## By sport',
    '',
    ...table(summarizeBy(signals, (s) => s.sport), 'sport'),
    '',
    '## By book',
    '',
    ...table(summarizeBy(signals, (s) => s.book), 'book'),
    '',
    '## Losing to the close (10+ closes, CLV below 0 or beat under 60 %)',
    '',
    ...(weak.length ? table(weak, 'sport · book · market') : ['None.']),
    '',
    '## Clearly fine (20+ closes, beat 75 %+)',
    '',
    ...(strong.length ? table(strong, 'sport · book · market') : ['None yet.']),
    '',
  ]
  return lines.join('\n')
}

