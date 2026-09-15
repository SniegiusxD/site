'use client'

import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { Loader2, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { BankrollEntry } from '@/lib/account-store'
import { formatEuro } from '@/lib/format-lt'
import { useAccount } from './account-provider'

const EASE = [0.22, 1, 0.36, 1] as const
const QUICK = [50, 100, 250]
const KIND_LABEL: Record<BankrollEntry['kind'], string> = {
  start: 'Pradinis',
  deposit: 'Įnešta',
  withdrawal: 'Išimta',
  adjustment: 'Pakoreguota',
}

const dateFormat = new Intl.DateTimeFormat('lt-LT', { timeZone: 'Europe/Vilnius', month: '2-digit', day: '2-digit' })

export function BankrollDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduced = useReducedMotion()
  const { account, setAccount } = useAccount()
  const [kind, setKind] = useState<'deposit' | 'withdrawal'>('deposit')
  const [amountText, setAmountText] = useState('')
  const [entries, setEntries] = useState<BankrollEntry[] | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const amountId = useId()
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setAmountText('')
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    window.setTimeout(() => inputRef.current?.focus(), 60)
    fetch('/api/bankroll')
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => body && setEntries(body.entries))
      .catch(() => setEntries([]))
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

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
      setEntries(body.entries)
      setAccount({
        ...account,
        bankroll: body.bankroll,
        preferences: { ...account.preferences, bankroll: body.bankroll.current },
      })
      setAmountText('')
      toast.success(kind === 'deposit' ? `Pridėta ${formatEuro(amount, 2)}` : `Atimta ${formatEuro(amount, 2)}`, {
        description: `Bankrollas dabar ${formatEuro(body.bankroll.current, 2)}`,
      })
    } catch {
      setError('Nepavyko pasiekti serverio.')
    } finally {
      setPending(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-night/70 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
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
              <div role="radiogroup" aria-label="Veiksmas" className="grid grid-cols-2 gap-1.5 rounded-xl bg-night/60 p-1.5">
                {(['deposit', 'withdrawal'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={kind === value}
                    onClick={() => setKind(value)}
                    className={`rounded-lg py-2.5 font-medium transition-colors ${kind === value ? 'bg-chalk text-night' : 'text-haze hover:text-chalk'}`}
                  >
                    {value === 'deposit' ? 'Įnešiau' : 'Išsiėmiau'}
                  </button>
                ))}
              </div>

              <label htmlFor={amountId} className="mt-5 block text-[0.95rem] font-medium">
                Suma
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
                {QUICK.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmountText(String(value))}
                    className="flex-1 rounded-lg bg-rail py-2 text-[0.95rem] font-medium text-haze transition-colors hover:text-chalk"
                  >
                    {value} €
                  </button>
                ))}
              </div>

              {error && (
                <p role="alert" className="mt-4 rounded-xl bg-brick-soft px-4 py-3 text-brick">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-chalk font-semibold text-night transition-transform hover:bg-white active:scale-[0.98] disabled:opacity-70"
              >
                {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
                {kind === 'deposit' ? 'Pridėti prie bankrollo' : 'Atimti iš bankrollo'}
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
      )}
    </AnimatePresence>
  )
}
