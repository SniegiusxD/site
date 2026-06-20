const TEAM_ALIASES: Record<string, string> = {
  'as monaco': 'monaco',
  'bayern munchen': 'bayern munich',
  'bayern munich': 'bayern munich',
  'crvena zvezda': 'red star belgrade',
  'crvena zvezda mts': 'red star belgrade',
  'czechia': 'czech republic',
  'partizan mozart bet': 'partizan belgrade',
  'partizan mozzart bet': 'partizan belgrade',
  'red star': 'red star belgrade',
  'ratiopharm ulm': 'ulm',
  'usa': 'united states',
  'u s a': 'united states',
  'zalgiris': 'zalgiris kaunas',
}

const PLAYER_ALIASES: Record<string, string> = {
  'a zverev': 'alexander zverev',
  's zverev': 'alexander zverev',
  'sascha zverev': 'alexander zverev',
}

const NON_DISTINCT_TOKENS = new Set([
  'afc',
  'basket',
  'basketball',
  'bc',
  'bk',
  'club',
  'cf',
  'fc',
  'fk',
  'hc',
  'kk',
  'ladies',
  'men',
  'mens',
  'rfc',
  'sc',
  'u18',
  'u19',
  'u20',
  'u21',
  'u23',
  'vc',
  'vk',
  'w',
  'woman',
  'women',
  'womens',
])

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function baseNormalize(s: string): string {
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/\((?:w|women|woman|ladies)\)/g, ' ')
    .replace(/\b(?:women'?s?|woman|ladies)\b/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeName(s: string): string {
  const base = baseNormalize(s)
  const aliased = TEAM_ALIASES[base] ?? PLAYER_ALIASES[base] ?? base
  const normalizedAlias = baseNormalize(aliased)
  const tokens = normalizedAlias
    .split(/\s+/)
    .filter((t) => t && !NON_DISTINCT_TOKENS.has(t) && !/^u\d{2}$/.test(t))
  return tokens.join(' ')
}

export function normalizedNameTokens(s: string): string[] {
  return normalizeName(s)
    .split(/\s+/)
    .filter((t) => t.length >= 2)
}

function slug(s: string): string {
  return normalizeName(s).replace(/[^a-z0-9]/g, '')
}

export function namesMatch(a: string, b: string): boolean {
  if (!a || !b) return false
  const ca = normalizeName(a)
  const cb = normalizeName(b)
  if (!ca || !cb) return false

  const sa = slug(ca)
  const sb = slug(cb)
  if (sa.length < 3 || sb.length < 3) return sa === sb
  if (sa === sb || sa.includes(sb) || sb.includes(sa)) return true

  const ta = normalizedNameTokens(ca)
  const tb = normalizedNameTokens(cb)
  if (!ta.length || !tb.length) return false

  const shared = ta.filter((t) => tb.some((u) => t === u || t.includes(u) || u.includes(t)))
  if (shared.length >= 2) return true
  if (ta.length === 1 || tb.length === 1) return shared.length === 1

  const lastA = ta[ta.length - 1]
  const lastB = tb[tb.length - 1]
  return lastA.length >= 4 && lastA === lastB
}
