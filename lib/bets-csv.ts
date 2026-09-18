import type { ActiveBet } from '@/lib/types'

/**
 * The bet history as a spreadsheet. Semicolons and a UTF-8 BOM, because Excel
 * in a Lithuanian locale reads commas as decimal separators and would otherwise
 * split "7,50" across two columns.
 */
const COLUMNS = [
  'Data',
  'Rungtynės',
  'Statymas',
  'Sportas',
  'Kontora',
  'Koeficientas',
  'Rodytas koeficientas',
  'Suma',
  'Būsena',
  'Pelnas',
  'Uždarymo tikimybė',
  'Įvykio ID',
] as const

const cell = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const number = (value: number | null | undefined) =>
  value === null || value === undefined ? '' : String(value).replace('.', ',')

export function betsToCsv(bets: ActiveBet[]): string {
  const rows = bets.map((bet) =>
    [
      cell(bet.placedAtIso?.slice(0, 19).replace('T', ' ')),
      cell(bet.match.replace(' vs ', ' – ')),
      cell(bet.betDescription),
      cell(bet.sport),
      cell(bet.bookmaker),
      number(bet.odds),
      number(bet.shownOdds ?? null),
      number(bet.stake),
      cell(bet.canonicalOutcome ?? bet.status),
      number(bet.profit),
      number(bet.closingFairProb ?? null),
      cell(bet.eventKey ?? ''),
    ].join(';'),
  )
  return `\ufeff${COLUMNS.join(';')}\n${rows.join('\n')}\n`
}

export function csvFileName(now: Date = new Date()): string {
  return `statyk-statymai-${now.toISOString().slice(0, 10)}.csv`
}
