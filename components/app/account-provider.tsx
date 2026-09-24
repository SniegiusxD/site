'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Account } from '@/lib/account-store'
import type { Settings } from '@/lib/preferences'

type AccountContextValue = {
  account: Account
  email: string
  /** When the account was created (ISO), for "Narys nuo". */
  memberSince: string | null
  setAccount: (account: Account) => void
  /** Optimistic settings change, saved after a short pause. */
  updateSettings: (patch: Partial<Settings>) => void
  saveError: string | null
}

const AccountContext = createContext<AccountContextValue | null>(null)

const SAVE_DELAY_MS = 700

export function AccountProvider({
  initial,
  email,
  memberSince,
  children,
}: {
  initial: Account
  email: string
  memberSince: string | null
  children: React.ReactNode
}) {
  const [account, setAccount] = useState(initial)
  const [saveError, setSaveError] = useState<string | null>(null)
  const timer = useRef<number | null>(null)
  // The debounced save sends the newest settings, not the ones that were on
  // screen when the timer was scheduled. The mirror is updated after render,
  // which is long before the timer fires.
  const latest = useRef(account)
  useEffect(() => {
    latest.current = account
  }, [account])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setAccount((current) => ({ ...current, preferences: { ...current.preferences, ...patch } }))
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      const settings = Object.fromEntries(
        Object.entries(latest.current.preferences).filter(([key]) => key !== 'bankroll'),
      )
      try {
        const response = await fetch('/api/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        })
        const body = await response.json().catch(() => null)
        if (!response.ok) {
          setSaveError(body?.error ?? 'Nustatymų išsaugoti nepavyko.')
          return
        }
        setSaveError(null)
      } catch {
        setSaveError('Nustatymų išsaugoti nepavyko. Patikrink ryšį.')
      }
    }, SAVE_DELAY_MS)
  }, [])

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  const value = useMemo(
    () => ({ account, email, memberSince, setAccount, updateSettings, saveError }),
    [account, email, memberSince, updateSettings, saveError],
  )
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountContextValue {
  const value = useContext(AccountContext)
  if (!value) throw new Error('useAccount must be used inside AccountProvider')
  return value
}
