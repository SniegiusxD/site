'use client'

import { Check, Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { authClient } from '@/lib/auth-client'

type Mode = 'sign-up' | 'sign-in'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const identifierId = useId()
  const passwordId = useId()
  const termsId = useId()
  const errorId = useId()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const signUp = mode === 'sign-up'

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const value = identifier.trim()

    if (signUp && !EMAIL_PATTERN.test(value)) {
      setError('Įrašyk el. pašto adresą, pvz. vardas@gmail.com.')
      return
    }
    if (!signUp && value.length < 3) {
      setError('Įrašyk el. paštą arba vartotojo vardą.')
      return
    }
    if (password.length < 8) {
      setError('Slaptažodis turi būti bent 8 simbolių.')
      return
    }
    if (signUp && !accepted) {
      setError('Patvirtink, kad tau yra 21 metai ir sutinki su taisyklėmis.')
      return
    }

    setPending(true)
    try {
      const result = signUp
        ? await authClient.signUp.email({ email: value.toLowerCase(), password, name: value.split('@')[0] })
        : value.includes('@')
          ? await authClient.signIn.email({ email: value.toLowerCase(), password })
          : await authClient.signIn.username({ username: value, password })

      if (result.error) {
        setError(explain(result.error, mode))
        return
      }
      router.push(signUp ? '/pradzia' : '/signalai')
      router.refresh()
    } catch {
      setError('Nepavyko pasiekti serverio. Patikrink ryšį ir bandyk dar kartą.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <h1 className="text-[2.75rem] sm:text-[3.25rem]">{signUp ? 'Sukurk nemokamą paskyrą' : 'Sveikas sugrįžęs'}</h1>
      <p className="mt-3 text-haze">
        {signUp
          ? 'Nemokamai matai signalus iki 2 % vertės. Norėdamas visų, viduje įsijungi 7 dienų bandymą — kortelės nereikia.'
          : 'Prisijunk ir žiūrėk, kur šiandien kontoros moka per daug.'}
      </p>

      <form onSubmit={submit} noValidate className="mt-9 space-y-5" aria-describedby={error ? errorId : undefined}>
        <div>
          <label htmlFor={identifierId} className="text-[0.95rem] font-medium">
            {signUp ? 'El. paštas' : 'El. paštas arba vartotojo vardas'}
          </label>
          <input
            id={identifierId}
            type={signUp ? 'email' : 'text'}
            inputMode={signUp ? 'email' : 'text'}
            autoComplete={signUp ? 'email' : 'username'}
            autoCapitalize="none"
            spellCheck={false}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="mt-2 h-12 w-full rounded-xl bg-stand px-4 text-chalk outline-none hairline transition-shadow placeholder:text-haze-dim focus:shadow-[inset_0_0_0_1.5px_var(--chalk)]"
            placeholder={signUp ? 'vardas@gmail.com' : ''}
          />
        </div>

        <div>
          <label htmlFor={passwordId} className="text-[0.95rem] font-medium">
            Slaptažodis
          </label>
          <div className="relative mt-2">
            <input
              id={passwordId}
              type={showPassword ? 'text' : 'password'}
              autoComplete={signUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-xl bg-stand pr-12 pl-4 text-chalk outline-none hairline transition-shadow focus:shadow-[inset_0_0_0_1.5px_var(--chalk)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Slėpti slaptažodį' : 'Rodyti slaptažodį'}
              className="absolute inset-y-0 right-1 grid w-10 place-items-center rounded-lg text-haze hover:text-chalk"
            >
              {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
            </button>
          </div>
          {signUp ? (
            <p className="mt-2 text-[0.85rem] text-haze-dim">Bent 8 simboliai.</p>
          ) : (
            <p className="mt-2 text-[0.9rem]">
              <Link href="/slaptazodis" className="text-haze underline decoration-rail-strong underline-offset-4 hover:text-chalk">
                Pamiršai slaptažodį?
              </Link>
            </p>
          )}
        </div>

        {signUp && (
          <label htmlFor={termsId} className="flex cursor-pointer items-start gap-3 text-[0.95rem] text-haze">
            <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
              <input
                id={termsId}
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="peer absolute inset-0 cursor-pointer appearance-none rounded-md bg-stand hairline checked:bg-chalk"
              />
              <Check className="pointer-events-none relative size-3.5 text-night opacity-0 peer-checked:opacity-100" aria-hidden />
            </span>
            <span>
              Man yra 21 metai ir sutinku su{' '}
              <Link href="/taisykles" className="text-chalk underline decoration-rail-strong underline-offset-4">
                taisyklėmis
              </Link>{' '}
              ir{' '}
              <Link href="/privatumas" className="text-chalk underline decoration-rail-strong underline-offset-4">
                privatumo politika
              </Link>
              .
            </span>
          </label>
        )}

        {error && (
          <p id={errorId} role="alert" className="rounded-xl bg-brick-soft px-4 py-3 text-[0.95rem] text-brick">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-floodlight font-semibold text-night transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70"
        >
          {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
          {signUp ? 'Sukurti paskyrą' : 'Prisijungti'}
        </button>
      </form>

      <p className="mt-8 text-haze">
        {signUp ? 'Jau turi paskyrą? ' : 'Dar neturi paskyros? '}
        <Link
          href={signUp ? '/prisijungti' : '/registracija'}
          className="font-medium text-chalk underline decoration-rail-strong underline-offset-4 hover:decoration-chalk"
        >
          {signUp ? 'Prisijunk' : 'Sukurk nemokamą paskyrą'}
        </Link>
      </p>
    </div>
  )
}

function explain(error: { code?: string; message?: string; status?: number }, mode: Mode): string {
  const code = error.code ?? ''
  if (code.includes('ALREADY_EXISTS')) return 'Paskyra su šiuo el. paštu jau yra. Prisijunk.'
  if (code.includes('INVALID_EMAIL_OR_PASSWORD') || code.includes('INVALID_USERNAME_OR_PASSWORD') || error.status === 401) {
    return 'Neteisingas el. paštas, vartotojo vardas arba slaptažodis.'
  }
  if (code.includes('PASSWORD_TOO_SHORT')) return 'Slaptažodis turi būti bent 8 simbolių.'
  if (code.includes('PASSWORD_TOO_LONG')) return 'Slaptažodis per ilgas.'
  if (code.includes('INVALID_EMAIL')) return 'El. pašto adresas netinkamas.'
  if (error.status === 429) return 'Per daug bandymų. Palauk minutę ir bandyk dar kartą.'
  return mode === 'sign-up' ? 'Nepavyko sukurti paskyros. Bandyk dar kartą.' : 'Nepavyko prisijungti. Bandyk dar kartą.'
}
