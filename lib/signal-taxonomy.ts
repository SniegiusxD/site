/**
 * What the signals actually contain, in Lithuanian. Built from the live data on
 * 2026-09-18 (7 days: basketball 548, football 319, tennis 268, baseball 101,
 * ice_hockey 62, handball 34, esports 16, american_football 9, volleyball 1,
 * snooker 1; markets spread, total, team_total, moneyline, moneyline_3way,
 * moneyline_reg, spread_1h, total_1h, spreads_sets, team_totals_1h,
 * corner_total, handicap_3way).
 *
 * The bot mirrors these groupings in scripts/telegram_bot_service.py; change
 * both together.
 */

export const SPORTS = [
  { key: 'basketball', label: 'Krepšinis' },
  { key: 'football', label: 'Futbolas' },
  { key: 'tennis', label: 'Tenisas' },
  { key: 'baseball', label: 'Beisbolas' },
  { key: 'ice_hockey', label: 'Ledo ritulys' },
  { key: 'handball', label: 'Rankinis' },
  { key: 'volleyball', label: 'Tinklinis' },
  { key: 'american_football', label: 'Amerikietiškas futbolas' },
  { key: 'esports', label: 'E. sportas' },
  { key: 'snooker', label: 'Snukeris' },
] as const

export type SportKey = (typeof SPORTS)[number]['key']

/** Market families, each covering the raw market names the publisher writes. */
export const MARKET_FAMILIES = [
  { key: 'moneyline', label: 'Nugalėtojas', markets: ['moneyline', 'moneyline_3way', 'moneyline_reg'] },
  { key: 'spread', label: 'Pranašumas', markets: ['spread', 'spread_1h', 'spreads_sets', 'handicap_3way'] },
  { key: 'total', label: 'Suminis', markets: ['total', 'total_1h'] },
  { key: 'team_total', label: 'Komandos suminis', markets: ['team_total', 'team_totals_1h'] },
  { key: 'corners', label: 'Kampiniai', markets: ['corner_total'] },
] as const

export type MarketFamilyKey = (typeof MARKET_FAMILIES)[number]['key']

/** Whole match or a part of it. A market name ending in a period suffix is a part. */
export const PERIODS = [
  { key: 'full', label: 'Visos rungtynės' },
  { key: 'part', label: 'Kėliniai ir setai' },
] as const

export type PeriodKey = (typeof PERIODS)[number]['key']

export const PART_MARKETS = ['spread_1h', 'total_1h', 'team_totals_1h', 'spreads_sets'] as const

/** Odds bands, as ranges rather than labels only, so the filter stays honest. */
export const ODDS_BANDS = [
  { key: 'all', label: 'Visi', min: 1, max: 100 },
  { key: 'short', label: 'iki 2,00', min: 1, max: 2 },
  { key: 'mid', label: '2,00–3,00', min: 2, max: 3 },
  { key: 'long', label: 'nuo 3,00', min: 3, max: 100 },
] as const

export const SPORT_KEYS = SPORTS.map((sport) => sport.key) as readonly string[]
export const MARKET_KEYS = MARKET_FAMILIES.map((family) => family.key) as readonly string[]
export const PERIOD_KEYS = PERIODS.map((period) => period.key) as readonly string[]

export const sportLabel = (key: string) => SPORTS.find((sport) => sport.key === key)?.label ?? key
export const marketLabel = (key: string) => MARKET_FAMILIES.find((family) => family.key === key)?.label ?? key
export const periodLabel = (key: string) => PERIODS.find((period) => period.key === key)?.label ?? key

/** The band whose range matches, or null when the pair is a custom range. */
export function bandFor(min: number, max: number) {
  return ODDS_BANDS.find((band) => band.min === min && band.max === max) ?? null
}
