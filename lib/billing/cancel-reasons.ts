/**
 * Why a member left, in their words and in Stripe's cancellation feedback
 * codes. Optional: leaving never waits on an answer.
 */
export const CANCEL_REASONS = [
  { key: 'price', label: 'Per brangu', stripe: 'too_expensive' },
  { key: 'time', label: 'Neturiu laiko statyti', stripe: 'unused' },
  { key: 'results', label: 'Nepatenkina rezultatai', stripe: 'low_quality' },
  { key: 'limited', label: 'Kontoros apribojo sumas', stripe: 'other' },
  { key: 'features', label: 'Trūksta funkcijų', stripe: 'missing_features' },
  { key: 'other', label: 'Kita', stripe: 'other' },
] as const

export type CancelReason = (typeof CANCEL_REASONS)[number]
