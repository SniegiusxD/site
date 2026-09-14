/** Lithuanian number formats: decimal comma, space before %, euro after the amount. */

const oddsFormat = new Intl.NumberFormat('lt-LT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const edgeFormat = new Intl.NumberFormat('lt-LT', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
})

const integerFormat = new Intl.NumberFormat('lt-LT', { maximumFractionDigits: 0 })

export function formatOdds(value: number): string {
  return oddsFormat.format(value)
}

/** A fraction (0.049) as a signed percentage ("+4,9 %"). */
export function formatEdge(fraction: number): string {
  return `${edgeFormat.format(fraction * 100)} %`
}

export function formatInteger(value: number): string {
  return integerFormat.format(value)
}

export function formatEuro(value: number, fractionDigits = 0): string {
  const formatted = new Intl.NumberFormat('lt-LT', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
  return `${formatted} €`
}

/** Edge of a book price against a fair (margin-free) price. */
export function edgeOf(bookOdds: number, fairOdds: number): number {
  return bookOdds / fairOdds - 1
}

/** Full Kelly stake as a fraction of bankroll; never negative. */
export function kellyFraction(bookOdds: number, probability: number): number {
  const b = bookOdds - 1
  if (b <= 0) return 0
  return Math.max(0, (b * probability - (1 - probability)) / b)
}
