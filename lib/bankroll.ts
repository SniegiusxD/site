export type BankrollKind = 'start' | 'deposit' | 'withdrawal' | 'adjustment'

export type BankrollChange = { kind: 'deposit' | 'withdrawal'; amount: number; note: string | null }

type Result = { ok: true; value: BankrollChange; signedAmount: number } | { ok: false; error: string }

/**
 * Validates a deposit or withdrawal. `amount` is always positive in the input;
 * the ledger stores withdrawals as negative. A withdrawal can't take the
 * bankroll below zero.
 */
export function parseBankrollChange(input: unknown, currentBankroll: number): Result {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Trūksta sumos.' }
  const raw = input as Record<string, unknown>
  if (raw.kind !== 'deposit' && raw.kind !== 'withdrawal') {
    return { ok: false, error: 'Pasirink: įnešti ar išimti.' }
  }
  const amount = raw.amount
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    return { ok: false, error: 'Suma turi būti didesnė už 0 €.' }
  }
  const rounded = Math.round(amount * 100) / 100
  if (raw.kind === 'withdrawal' && rounded > currentBankroll + 1e-9) {
    return { ok: false, error: 'Negali išimti daugiau, nei turi bankrolle.' }
  }
  const note = typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim().slice(0, 120) : null
  return {
    ok: true,
    value: { kind: raw.kind, amount: rounded, note },
    signedAmount: raw.kind === 'withdrawal' ? -rounded : rounded,
  }
}
