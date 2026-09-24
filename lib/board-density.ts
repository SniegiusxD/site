/**
 * The board's row density: the usual two-to-three-line rows, or one line per
 * signal for members who scan a lot of them. Kept in localStorage (per
 * browser) and mirrored into a cookie, so the server renders the chosen
 * density in the first frame instead of switching after load.
 */
export type Density = 'normal' | 'compact'

export const DENSITY_KEY = 'board-density'
export const DENSITY_COOKIE = 'kr-board-density'

/** A stored density, or undefined for anything else (the caller's fallback then applies). */
export function parseDensity(value: unknown): Density | undefined {
  return value === 'compact' || value === 'normal' ? value : undefined
}

/** The cookie as the server sees it; anything unknown is the usual board. */
export function densityFromCookie(raw: string | undefined): Density {
  return raw === 'compact' ? 'compact' : 'normal'
}

export function densityCookie(density: Density): string {
  return `${DENSITY_COOKIE}=${density}; Path=/; Max-Age=31536000; SameSite=Lax`
}
