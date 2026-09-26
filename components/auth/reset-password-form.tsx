'use client'

import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useId, useState } from 'react'
import { authClient } from '@/lib/auth-client'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const field =
  'mt-2 h-12 w-full rounded-xl bg-night/60 px-4 text-chalk outline-none hairline transition-shadow placeholder:text-haze-dim focus:shadow-[inset_0_0_0_1.5px_var(--chalk)]'
const submitClass =
  'flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-floodlight font-semibold text-night transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70'
const linkClass = 'font-medium text-chalk underline decoration-rail-strong underline-offset-4 hover:decoration-chalk'

function ErrorNote({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="rounded-xl bg-brick-soft px-4 py-3 text-[0.95rem] text-brick">
      {children}
    </p>
  )
}

/**
 * Step one: an email address in, a link out. The answer is the same whether
 * or not the address has an account, so the form cannot be used to find out
 * who is a member.
 */
export function RequestResetForm() {
  const emailId = useId()
  const errorId = useId()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const value = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(value)) {
      setError('Įrašyk el. pašto adresą, kuriuo registravaisi.')
      return
    }
    setPending(true)
    try {
      const result = await authClient.requestPasswordReset({ email: value, redirectTo: '/slaptazodis/naujas' })
      if (result.error) {
        setError(
          result.error.status === 429
            ? 'Per daug bandymų. Palauk kelias minutes ir bandyk vėl.'
            : 'Nepavyko išsiųsti laiško. Bandyk dar kartą arba parašyk mums.',
        )
        return
      }
      setSent(true)
    } catch {
      setError('Nepavyko pasiekti serverio. Patikrink ryšį ir bandyk dar kartą.')
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <p role="status" className="mt-9 rounded-xl bg-night/60 p-5 text-haze hairline">
        Jei paskyra su adresu <span className="text-chalk">{email.trim()}</span> yra, išsiuntėm nuorodą slaptažodžiui pakeisti.
        Ji galioja 1 valandą. Laiško nematai? Patikrink „Šlamšto“ aplanką.
      </p>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="mt-9 space-y-5" aria-describedby={error ? errorId : undefined}>
      <div>
        <label htmlFor={emailId} className="text-[0.95rem] font-medium">
          El. paštas
        </label>
        <input
          id={emailId}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={field}
          placeholder="vardas@gmail.com"
        />
      </div>
      {error && <ErrorNote id={errorId}>{error}</ErrorNote>}
      <button type="submit" disabled={pending} className={submitClass}>
        {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
        Siųsti nuorodą
      </button>
    </form>
  )
}

/** Step two: the link lands here with a token; a new password is set once. */
export function NewPasswordForm({ token, linkError }: { token: string | null; linkError: boolean }) {
  const passwordId = useId()
  const errorId = useId()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)

  if (linkError || !token) {
    return (
      <p className="mt-9 rounded-xl bg-night/60 p-5 text-haze hairline">
        Ši nuoroda nebegalioja: ji veikia 1 valandą ir tik vieną kartą.{' '}
        <Link href="/slaptazodis" className={linkClass}>
          Gauti naują nuorodą
        </Link>
      </p>
    )
  }

  if (done) {
    return (
      <p role="status" className="mt-9 rounded-xl bg-night/60 p-5 text-haze hairline">
        Slaptažodis pakeistas. Kitose naršyklėse tave atjungėm.{' '}
        <Link href="/prisijungti" className={linkClass}>
          Prisijungti
        </Link>
      </p>
    )
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Slaptažodis turi būti bent 8 simbolių.')
      return
    }
    setPending(true)
    try {
      const result = await authClient.resetPassword({ newPassword: password, token: token! })
      if (result.error) {
        setError(
          (result.error.code ?? '').includes('INVALID_TOKEN')
            ? 'Nuoroda nebegalioja. Gauk naują ir bandyk dar kartą.'
            : 'Nepavyko pakeisti slaptažodžio. Bandyk dar kartą.',
        )
        return
      }
      setDone(true)
    } catch {
      setError('Nepavyko pasiekti serverio. Patikrink ryšį ir bandyk dar kartą.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-9 space-y-5" aria-describedby={error ? errorId : undefined}>
      <div>
        <label htmlFor={passwordId} className="text-[0.95rem] font-medium">
          Naujas slaptažodis
        </label>
        <div className="relative mt-2">
          <input
            id={passwordId}
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-12 w-full rounded-xl bg-night/60 pr-12 pl-4 text-chalk outline-none hairline transition-shadow focus:shadow-[inset_0_0_0_1.5px_var(--chalk)]"
          />
          <button
            type="button"
            onClick={() => setShow((value) => !value)}
            aria-label={show ? 'Slėpti slaptažodį' : 'Rodyti slaptažodį'}
            className="absolute inset-y-0 right-1 grid w-10 place-items-center rounded-lg text-haze hover:text-chalk"
          >
            {show ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
          </button>
        </div>
        <p className="mt-2 text-[0.85rem] text-haze-dim">Bent 8 simboliai.</p>
      </div>
      {error && <ErrorNote id={errorId}>{error}</ErrorNote>}
      <button type="submit" disabled={pending} className={submitClass}>
        {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
        Išsaugoti slaptažodį
      </button>
    </form>
  )
}
