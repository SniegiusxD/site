import type { BetStatus } from "./types"

export const eur = (n: number) =>
  `${n < 0 ? "-" : ""}€${Math.abs(n).toLocaleString("lt-LT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export const eur0 = (n: number) =>
  `${n < 0 ? "-" : ""}€${Math.abs(n).toLocaleString("lt-LT", {
    maximumFractionDigits: 0,
  })}`

export const pct = (n: number, digits = 1) => `${n.toFixed(digits)}%`

/** Time until kickoff in local timezone (browser). */
export function formatTimeUntil(startsAt: string | undefined): string {
  if (!startsAt) return "—"
  const diffMs = new Date(startsAt).getTime() - Date.now()
  if (diffMs <= 0) return "Pradėta"
  const mins = Math.floor(diffMs / 60_000)
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  if (hrs > 0) return `${hrs} val ${rem} min`
  return `${mins} min`
}

/** Local kickoff clock + countdown — for Aktyvūs / signal cards. */
export function formatKickoff(startsAt: string | undefined): string {
  if (!startsAt) return "—"
  try {
    const d = new Date(startsAt)
    if (Number.isNaN(d.getTime())) return "—"
    const clock = d.toLocaleTimeString("lt-LT", {
      hour: "2-digit",
      minute: "2-digit",
    })
    const until = formatTimeUntil(startsAt)
    if (until === "Pradėta") return `${clock} · pradėta`
    return `${clock} · po ${until}`
  } catch {
    return "—"
  }
}

export const STATUS_LABEL: Record<BetStatus, string> = {
  laukia: "Laukia",
  laimeta: "Laimėta",
  pralaimeta: "Pralaimėta",
  grazinta: "Grąžinta",
  neisspresta: "Neišspręsta",
}

/** Tailwind classes for a status pill. */
export const STATUS_CLASS: Record<BetStatus, string> = {
  laukia: "bg-warning/15 text-warning border-warning/30",
  laimeta: "bg-success/15 text-success border-success/30",
  pralaimeta: "bg-danger/15 text-danger border-danger/30",
  grazinta: "bg-muted text-muted-foreground border-border",
  neisspresta: "bg-muted text-muted-foreground border-border",
}
