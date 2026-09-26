const WINDOW_MIN = 15

/** Minutes to kickoff while it is under a quarter of an hour away; otherwise null. */
export function soonMinutes(startsAt: string, now: Date): number | null {
  const minutes = (new Date(startsAt).getTime() - now.getTime()) / 60_000
  return minutes > 0 && minutes <= WINDOW_MIN ? minutes : null
}

/**
 * "Tuoj prasideda": under 15 minutes to kickoff, a small ring beside the time
 * empties with the clock (the board's 30-second tick moves it), so a row about
 * to close reads differently from one that has hours. Drawn state, not an
 * animation; only the soft pulse moves, and calm mode stops it.
 */
export function StartingSoon({ startsAt, now }: { startsAt: string; now: Date }) {
  const minutes = soonMinutes(startsAt, now)
  if (minutes === null) return null
  const share = minutes / WINDOW_MIN
  const r = 6
  const length = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="mr-1 inline-block size-3.5 -translate-y-px animate-pulse align-middle">
      <circle cx="8" cy="8" r={r} fill="none" strokeWidth="2.5" className="stroke-rail-strong" />
      <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - share)}
        transform="rotate(-90 8 8)"
        className="stroke-warning"
      />
    </svg>
  )
}
