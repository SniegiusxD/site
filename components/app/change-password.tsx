'use client'

import { Loader2 } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'

const field =
  'mt-1.5 h-12 w-full rounded-xl bg-night/60 px-4 text-chalk outline-none hairline focus:shadow-[inset_0_0_0_1.5px_var(--chalk)]'

/**
 * Change the password while signed in. Other devices are signed out, so a
 * password changed because it leaked also ends the sessions that used it.
 */
export function ChangePassword() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const currentId = useId()
  const nextId = useId()
  const errorId = useId()

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-4 block text-[0.95rem] text-haze underline decoration-rail-strong underline-offset-4 hover:text-chalk">
        Keisti slaptažodį
      </button>
    )
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (next.length < 8) {
      setError('Naujas slaptažodis turi būti bent 8 simbolių.')
      return
    }
    setPending(true)
    try {
      const result = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true })
      if (result.error) {
        setError(
          (result.error.code ?? '').includes('INVALID_PASSWORD') || result.error.status === 400
            ? 'Dabartinis slaptažodis neteisingas.'
            : result.error.status === 429
              ? 'Per daug bandymų. Palauk kelias minutes.'
              : 'Nepavyko pakeisti slaptažodžio. Bandyk dar kartą.',
        )
        return
      }
      toast.success('Slaptažodis pakeistas. Kituose įrenginiuose tave atjungėm.')
      setOpen(false)
      setCurrent('')
      setNext('')
    } catch {
      setError('Nepavyko pasiekti serverio. Patikrink ryšį ir bandyk dar kartą.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-4 max-w-[24rem] space-y-3" aria-describedby={error ? errorId : undefined}>
      <div>
        <label htmlFor={currentId} className="text-[0.95rem] text-haze">
          Dabartinis slaptažodis
        </label>
        <input id={currentId} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={field} />
      </div>
      <div>
        <label htmlFor={nextId} className="text-[0.95rem] text-haze">
          Naujas slaptažodis
        </label>
        <input id={nextId} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={field} />
      </div>
      {error && (
        <p id={errorId} role="alert" className="rounded-xl bg-brick-soft px-4 py-3 text-[0.95rem] text-brick">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="kr-press inline-flex min-h-11 items-center gap-2 rounded-xl bg-chalk px-4 font-semibold text-night disabled:opacity-70">
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Išsaugoti
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-xl px-4 text-haze hover:text-chalk">
          Atšaukti
        </button>
      </div>
    </form>
  )
}
