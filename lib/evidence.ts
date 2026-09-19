import evidence from '@/lib/data/site-evidence.json'

/**
 * The record grouped by fixture. Several lines of one match are one opinion,
 * so a count of signals overstates how much independent evidence there is:
 * every number here counts a fixture once, and the signal count travels with
 * it as execution volume rather than as sample size.
 *
 * Exported by aggregator `scripts/export_site_evidence.py` from the settlement
 * ledger joined to the CLV database. Re-run it and replace the JSON; do not
 * edit the numbers by hand.
 */
export type SiteEvidence = {
  source: string
  generatedAt: string
  fixtures: number
  signals: number
  firstDate: string
  lastDate: string
  /** Mean return per 1 € staked, flat stakes, one fixture counting once. */
  roi: number
  roiLow: number
  roiHigh: number
  /** True only when the whole 95 % interval sits above zero. */
  beatsZero: boolean
  averageOdds: number
  signalsPerFixture: number
  fixturesWithClosing: number
  clvMean: number | null
  clvMedian: number | null
  fixturesBeatingClose: number
  byBook: Record<string, number>
  outcomes: Record<string, number>
}

export const EVIDENCE = evidence as SiteEvidence

/** The share of fixtures whose price beat the closing price. */
export const beatShare = (record: SiteEvidence = EVIDENCE) =>
  record.fixturesWithClosing > 0 ? record.fixturesBeatingClose / record.fixturesWithClosing : null

const MONTHS = [
  'sausio',
  'vasario',
  'kovo',
  'balandžio',
  'gegužės',
  'birželio',
  'liepos',
  'rugpjūčio',
  'rugsėjo',
  'spalio',
  'lapkričio',
  'gruodžio',
]

/** "rugsėjo 9–19 d." — the window a number covers, never left implied. */
export function evidencePeriod(record: SiteEvidence = EVIDENCE): string {
  const [, firstMonth, firstDay] = record.firstDate.split('-').map(Number)
  const [, lastMonth, lastDay] = record.lastDate.split('-').map(Number)
  if (firstMonth === lastMonth) return `${MONTHS[firstMonth - 1]} ${firstDay}–${lastDay} d.`
  return `${MONTHS[firstMonth - 1]} ${firstDay} – ${MONTHS[lastMonth - 1]} ${lastDay} d.`
}
