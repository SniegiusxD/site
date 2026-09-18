export type BankrollKind = 'start' | 'deposit' | 'withdrawal' | 'adjustment'

export type BankrollChange = { kind: 'deposit' | 'withdrawal' | 'adjustment'; amount: number; note: string | null }

type Result = { ok: true; value: BankrollChange; signedAmount: number } | { ok: false; error: string }

const MIN_SET = 10
const MAX_AMOUNT = 1_000_000

/**
 * Validates a bankroll change. `amount` is always positive in the input. A
 * deposit adds it; a withdrawal takes it out and can't take the bankroll below
 * zero; `set` makes the bankroll exactly `amount`, stored as an adjustment for
 * the difference so the ledger still adds up.
 */
export function parseBankrollChange(input: unknown, currentBankroll: number): Result {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Trūksta sumos.' }
  const raw = input as Record<string, unknown>
  if (raw.kind !== 'deposit' && raw.kind !== 'withdrawal' && raw.kind !== 'set') {
    return { ok: false, error: 'Pasirink: įnešti ar išimti.' }
  }
  const amount = raw.amount
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    return { ok: false, error: 'Suma turi būti didesnė už 0 €.' }
  }
  const rounded = Math.round(amount * 100) / 100
  const note = typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim().slice(0, 120) : null

  if (raw.kind === 'set') {
    if (rounded < MIN_SET) return { ok: false, error: `Bankrollas turi būti bent ${MIN_SET} €.` }
    const difference = Math.round((rounded - currentBankroll) * 100) / 100
    if (Math.abs(difference) < 0.01) return { ok: false, error: 'Bankrollas jau toks.' }
    return { ok: true, value: { kind: 'adjustment', amount: rounded, note }, signedAmount: difference }
  }

  if (raw.kind === 'withdrawal' && rounded > currentBankroll + 1e-9) {
    return { ok: false, error: 'Negali išimti daugiau, nei turi bankrolle.' }
  }
  return {
    ok: true,
    value: { kind: raw.kind, amount: rounded, note },
    signedAmount: raw.kind === 'withdrawal' ? -rounded : rounded,
  }
}
