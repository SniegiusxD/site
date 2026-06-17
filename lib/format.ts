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

export const STATUS_LABEL: Record<BetStatus, string> = {
  laukia: "Laukia",
  laimeta: "Laimėta",
  pralaimeta: "Pralaimėta",
  grazinta: "Grąžinta",
}

/** Tailwind classes for a status pill. */
export const STATUS_CLASS: Record<BetStatus, string> = {
  laukia: "bg-warning/15 text-warning border-warning/30",
  laimeta: "bg-success/15 text-success border-success/30",
  pralaimeta: "bg-danger/15 text-danger border-danger/30",
  grazinta: "bg-muted text-muted-foreground border-border",
}
