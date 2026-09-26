'use client'

import { Loader2 } from 'lucide-react'
import { useId, useState } from 'react'

const field =
  'mt-2 w-full rounded-xl bg-night/60 px-4 text-chalk outline-none hairline transition-shadow placeholder:text-haze-dim focus:shadow-[inset_0_0_0_1.5px_var(--chalk)]'

/** A message and an address to answer to. Nothing else is asked or kept. */
export function ContactForm() {
  const emailId = useId()
  const messageId = useId()
  const errorId = useId()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message, website }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        setError(
          response.status === 429 && !body?.error
            ? 'Per daug žinučių iš karto. Palauk kelias minutes.'
            : (body?.error ?? 'Nepavyko išsiųsti. Bandyk dar kartą.'),
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
      <p role="status" className="rounded-xl bg-night/60 p-5 text-haze hairline">
        Gavom. Atsakysim į <span className="text-chalk">{email.trim()}</span>, dažniausiai per parą.
      </p>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5" aria-describedby={error ? errorId : undefined}>
      <div>
        <label htmlFor={emailId} className="text-[0.95rem] font-medium">
          Tavo el. paštas
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
          className={`${field} h-12`}
          placeholder="vardas@gmail.com"
        />
      </div>
      <div>
        <label htmlFor={messageId} className="text-[0.95rem] font-medium">
          Žinutė
        </label>
        <textarea
          id={messageId}
          rows={6}
          maxLength={2000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={`${field} py-3`}
          placeholder="Pvz. negaliu prisijungti, nurodau registracijos el. paštą…"
        />
      </div>
      {/* A trap for bots: hidden from people and from screen readers. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        className="absolute -left-[9999px] size-px opacity-0"
      />
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
        Siųsti
      </button>
    </form>
  )
}
