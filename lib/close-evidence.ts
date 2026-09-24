/**
 * How far closing-line value (CLV) can be trusted right now, from the
 * scanner's single-row `site_evidence_snapshot` table (id = 1).
 *
 * The data's owner decides reliability: the site uses `close_trust.trusted`
 * and nothing else. A positive CLV, or the mere existence of some closes, never
 * makes it trustworthy. When it is not trusted, the reasons are shown.
 *
 * Pure: no database import, so client components can use the labels. The
 * reader lives in lib/close-evidence-store.ts.
 */

export const TRUST_REASONS = [
  'sample_too_small',
  'coverage_below_threshold',
  'freshness_below_threshold',
  'book_concentration_above_threshold',
  'post_start_capture_detected',
] as const
export type TrustReason = (typeof TRUST_REASONS)[number]

/** One short sentence per reason, in the order they are listed. */
export const REASON_TEXT: Record<TrustReason, string> = {
  sample_too_small: 'Per mažai signalų su uždarymo kaina.',
  coverage_below_threshold: 'Uždarymo kainą turim per mažai daliai signalų.',
  freshness_below_threshold: 'Per daug uždarymo kainų užfiksuota per anksti prieš rungtynes.',
  book_concentration_above_threshold: 'Beveik visi duomenys iš vienos kontoros.',
  post_start_capture_detected: 'Dalis kainų užfiksuota jau prasidėjus rungtynėms.',
}

export type CloseEvidence = {
  generatedAt: string | null
  /** Exact, fresh pre-start closes ÷ unique published selections, 0–1; null when unknown. */
  coverage: number | null
  trusted: boolean
  /** Known reason codes only, in the order the scanner gave them. */
  reasons: TrustReason[]
}

const isReason = (value: unknown): value is TrustReason => typeof value === 'string' && (TRUST_REASONS as readonly string[]).includes(value)

function share(value: unknown): number | null {
  const number = typeof value === 'string' ? Number(value) : value
  if (typeof number !== 'number' || !Number.isFinite(number)) return null
  return Math.min(1, Math.max(0, number))
}

function isoOf(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
  if (typeof value !== 'string') return null
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : new Date(time).toISOString()
}

function objectOf(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    try {
      return objectOf(JSON.parse(value))
    } catch {
      return null
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

/**
 * The snapshot row as the site needs it. Anything malformed reads as "not
 * trusted": only a literal `trusted: true` in `close_trust` is trust.
 */
export function parseCloseEvidence(row: unknown): CloseEvidence | null {
  const record = objectOf(row)
  if (!record) return null
  const trust = objectOf(record.close_trust)
  const reasons = Array.isArray(trust?.reasons) ? trust.reasons.filter(isReason) : []
  return {
    generatedAt: isoOf(record.generated_at),
    coverage: share(record.close_coverage),
    trusted: trust?.trusted === true,
    reasons: [...new Set(reasons)],
  }
}

export type TrustLabel = {
  trusted: boolean
  /** "CLV patikimas" or "CLV dar nepatikimas". */
  title: string
  /** Why not, in plain words; empty when trusted. */
  reasons: string[]
  /** "Uždarymo kaina: 41 % signalų", or null when the share is unknown. */
  coverage: string | null
}

const percent = (value: number) => `${Math.round(value * 100)} %`

/** What to print next to a CLV figure. No snapshot yet means not trusted. */
export function trustLabel(evidence: CloseEvidence | null): TrustLabel {
  const coverage = evidence?.coverage != null ? `Uždarymo kaina: ${percent(evidence.coverage)} signalų` : null
  if (evidence?.trusted) return { trusted: true, title: 'CLV patikimas', reasons: [], coverage }
  const reasons = evidence
    ? evidence.reasons.map((reason) => REASON_TEXT[reason])
    : ['Uždarymo kainų patikimumas dar neįvertintas.']
  return {
    trusted: false,
    title: 'CLV dar nepatikimas',
    reasons: reasons.length ? reasons : ['Duomenų kokybė dar tikrinama.'],
    coverage,
  }
}
