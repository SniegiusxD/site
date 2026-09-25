/**
 * The site's motion vocabulary in one place, so every moment moves alike.
 * Motion answers something that just happened; transform and opacity only
 * (lib/__tests__/globals-css.test.ts); calm mode (lib/motion-mode.ts) turns it
 * into instant changes that still say what changed.
 */

/** The house curve: quick start, long soft landing. */
export const EASE = [0.22, 1, 0.36, 1] as const
export const EASE_CSS = 'cubic-bezier(0.22, 1, 0.36, 1)'
/** A slower landing for things that fill (calendars, bars). */
export const EASE_FILL = [0.16, 1, 0.3, 1] as const

/** Seconds. Answers to a tap are short; nothing celebrates for long. */
export const DURATION = {
  tap: 0.15,
  quick: 0.2,
  settle: 0.3,
  reveal: 0.5,
  celebrate: 0.75,
} as const

export const SPRING = {
  /** Toggles, chips, indicators: arrives fast, one small overshoot. */
  snappy: { type: 'spring', stiffness: 520, damping: 34, mass: 0.8 },
  /** Sheets and panels: heavier, no bounce you would notice. */
  soft: { type: 'spring', stiffness: 260, damping: 32 },
} as const

/** Delay (seconds) for the n-th item of a list that appears together. */
export const stagger = (index: number, step = 0.06, cap = 0.6) => Math.min(index * step, cap)
