/**
 * Who provides the service and controls the data, as the rules and the privacy
 * policy name them. The owner fills these in before launch; until every field
 * is set, both pages show a draft notice and a visible placeholder.
 */
export const legalEntity = {
  /** "UAB …", or the owner's name if working under an individual-activity certificate. */
  name: null as string | null,
  /** Įmonės kodas, or the individual-activity certificate number. */
  code: null as string | null,
  address: null as string | null,
  email: null as string | null,
  /** PVM mokėtojo kodas; null when not a VAT payer. */
  vatCode: null as string | null,
}

/** Minimum age for gambling in Lithuania since 2025-11-01 (ALĮ; LPT). */
export const MIN_AGE = 21

export const legalEntityComplete = Boolean(
  legalEntity.name && legalEntity.code && legalEntity.address && legalEntity.email,
)

/** A filled field, or a placeholder that is obviously unfinished. */
export const field = (value: string | null, label: string) => value ?? `[${label}]`
