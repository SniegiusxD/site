'use client'

import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useFocusTrap } from '@/lib/use-focus-trap'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { useApi } from '@/lib/use-api'
import { Loader2, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { BankrollEntry } from '@/lib/account-store'
import { formatEuro } from '@/lib/format-lt'
import { useAccount } from './account-provider'

const EASE = [0.22, 1, 0.36, 1] as const
type Mode = 'deposit' | 'withdrawal' | 'set'
const MODES: Array<{ value: Mode; label: string }> = [
  { value: 'deposit', label: 'Įnešiau' },
  { value: 'withdrawal', label: 'Išsiėmiau' },
  { value: 'set', label: 'Nustatyti' },
]
// Amounts to add or take out; whole bankrolls when setting it.
const QUICK: Record<Mode, number[]> = { deposit: [50, 100, 250], withdrawal: [50, 100, 250], set: [300, 500, 1000, 2000] }
const SUBMIT: Record<Mode, string> = {
  deposit: 'Pridėti prie bankrollo',
  withdrawal: 'Atimti iš bankrollo',
  set: 'Nustatyti bankrollą',
}
const KIND_LABEL: Record<BankrollEntry['kind'], string> = {
  start: 'Pradinis',
  deposit: 'Įnešta',
  withdrawal: 'Išimta',
  adjustment: 'Pakoreguota',
}

const dateFormat = new Intl.DateTimeFormat('lt-LT', { timeZone: 'Europe/Vilnius', month: '2-digit', day: '2-digit' })

export function BankrollDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <AnimatePresence>{open && <OpenBankrollDialog onClose={onClose} />}</AnimatePresence>
}

/** Mounted afresh for each opening, so form reset is initialization, not an effect. */
function OpenBankrollDialog({ onClose }: { onClose: () => void }) {
  const reduced = useReducedMotion()
  const { account, setAccount } = useAccount()
  const [kind, setKind] = useState<Mode>('deposit')
  const [amountText, setAmountText] = useState('')
  // The history as the server has it, until a change here returns a newer one.
  // A failed request shows the empty history rather than a spinner forever.
  const history = useApi<{ entries: BankrollEntry[] }>('/api/bankroll')
  const [posted, setPosted] = useState<BankrollEntry[] | null>(null)
  const entries = posted ?? history.data?.entries ?? (history.error ? [] : null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const amountId = useId()
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus starts in the amount field, stays in the dialog, and returns on close.
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, true, onClose, inputRef)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amount = Number(amountText.replace(/\s/g, '').replace(',', '.'))
    if (!(amount > 0)) {
      setError('Įrašyk sumą.')
      return
    }
    setPending(true)
    setError(null)
    try {
      const response = await fetch('/api/bankroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, amount }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        setError(body?.error ?? 'Nepavyko išsaugoti.')
        return
      }
      setPosted(body.entries)
      setAccount({
        ...account,
        bankroll: body.bankroll,
        preferences: { ...account.preferences, bankroll: body.bankroll.current },
      })
      setAmountText('')
      if (kind === 'set') {
        toast.success(`Bankrollas nustatytas: ${formatEuro(body.bankroll.current, 2)}`)
      } else {
        toast.success(kind === 'deposit' ? `Pridėta ${formatEuro(amount, 2)}` : `Atimta ${formatEuro(amount, 2)}`, {
          description: `Bankrollas dabar ${formatEuro(body.bankroll.current, 2)}`,
        })
      }
    } catch {
      setError('Nepavyko pasiekti serverio.')
    } finally {
      setPending(false)
    }
  }

  return (
    <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-night/70 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
            initial={reduced ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: 40, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="lift max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-stand p-6 sm:max-w-[28rem] sm:rounded-3xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="text-[2rem]">
                  Bankrollas
                </h2>
                <p className="mt-2 font-display text-5xl font-bold tnum">
                  <NumberFlow value={account.bankroll.current} locales="lt-LT" format={{ maximumFractionDigits: 2 }} suffix=" €" />
                </p>
                {account.bankroll.settledProfit !== 0 && (
                  <p className="mt-1 text-[0.9rem] text-haze">
                    Įnešta {formatEuro(account.bankroll.deposited)}, statymų rezultatas{' '}
                    <span className={account.bankroll.settledProfit > 0 ? 'text-pitch' : 'text-brick'}>
                      {account.bankroll.settledProfit > 0 ? '+' : ''}
                      {formatEuro(account.bankroll.settledProfit, 2)}
                    </span>
                  </p>
                )}
              </div>
              <button type="button" onClick={onClose} aria-label="Uždaryti" className="grid size-10 place-items-center rounded-full bg-rail text-haze hover:text-chalk">
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <form onSubmit={submit} className="mt-7">
              <div role="radiogroup" aria-label="Veiksmas" className="grid grid-cols-3 gap-1.5 rounded-xl bg-night/60 p-1.5">
                {MODES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={kind === value}
                    onClick={() => {
                      setKind(value)
                      setAmountText('')
                      setError(null)
                    }}
                    className={`rounded-lg py-2.5 font-medium transition-colors ${kind === value ? 'bg-chalk text-night' : 'text-haze hover:text-chalk'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label htmlFor={amountId} className="mt-5 block text-[0.95rem] font-medium">
                {kind === 'set' ? 'Naujas bankrollas' : 'Suma'}
              </label>
              <div className="relative mt-2">
                <input
                  ref={inputRef}
                  id={amountId}
                  inputMode="decimal"
                  value={amountText}
                  onChange={(event) => setAmountText(event.target.value.replace(/[^\d\s.,]/g, ''))}
                  className="h-14 w-full rounded-xl bg-night/60 pr-10 pl-4 font-display text-3xl font-bold outline-none hairline focus:shadow-[inset_0_0_0_1.5px_var(--chalk)]"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-xl text-haze">€</span>
              </div>
              <div className="mt-3 flex gap-2">
                {QUICK[kind].map((value) => {
                  const chosen = amountText === String(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={chosen}
                      onClick={() => setAmountText(String(value))}
                      className={`flex-1 rounded-lg py-2 text-[0.95rem] font-medium transition-colors ${
                        chosen ? 'bg-chalk text-night' : 'bg-rail text-haze hover:text-chalk'
                      }`}
                    >
                      {formatEuro(value)}
                    </button>
                  )
                })}
              </div>
              {kind === 'set' && <p className="mt-3 text-[0.9rem] text-haze">Skirtumas bus įrašytas į istoriją kaip pakoregavimas.</p>}

              {error && (
                <p role="alert" className="mt-4 rounded-xl bg-brick-soft px-4 py-3 text-brick">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-floodlight font-semibold text-night transition-transform hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70"
              >
                {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
                {SUBMIT[kind]}
              </button>
            </form>

            <div className="mt-8">
              <p className="text-[0.9rem] text-haze">Paskutiniai įrašai</p>
              {entries === null ? (
                <p className="mt-3 text-[0.95rem] text-haze-dim">Įkeliama…</p>
              ) : entries.length === 0 ? (
                <p className="mt-3 text-[0.95rem] text-haze-dim">Įrašų dar nėra.</p>
              ) : (
                <ul className="mt-3 divide-y divide-rail">
                  {entries.slice(0, 6).map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between py-2.5 text-[0.95rem]">
                      <span className="text-haze">
                        {KIND_LABEL[entry.kind]} <span className="text-haze-dim">{dateFormat.format(new Date(entry.createdAt))}</span>
                      </span>
                      <span className={`font-medium ${entry.amount < 0 ? 'text-brick' : ''}`}>
                        {entry.amount > 0 && entry.kind !== 'start' ? '+' : ''}
                        {formatEuro(entry.amount, 2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
    </motion.div>
  )
}
