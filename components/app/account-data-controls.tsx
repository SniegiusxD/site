'use client'

import { Download, Loader2, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'

/**
 * The two rights the privacy policy promises, where a member looks for them:
 * a copy of their data, and deleting the account. Deletion asks for the email
 * typed out, says plainly what it does to a running subscription, and cannot
 * be undone.
 */
export function AccountDataControls({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const inputId = useId()
  const matches = typed.trim().toLowerCase() === email.toLowerCase()

  async function remove() {
    setBusy(true)
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: typed }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error ?? 'Nepavyko ištrinti paskyros.')
      toast.success('Paskyra ištrinta.')
      await authClient.signOut().catch(() => {})
      window.location.assign('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nepavyko ištrinti paskyros.')
      setBusy(false)
    }
  }

  return (
    <div className="mt-8 border-t border-rail pt-6">
      <p className="font-medium">Tavo duomenys</p>
      <p className="mt-1 max-w-[60ch] text-[0.95rem] text-haze">
        Atsisiųsk viską, ką apie tave saugom: nustatymus, bankrollo įrašus, statymus su jų pakeitimų istorija, limitus, Telegram
        nustatymus ir prenumeratos būseną.
      </p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <a
          href="/api/account/export"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rail px-4 font-medium transition-colors hover:bg-rail-strong"
        >
          <Download className="size-4" aria-hidden />
          Atsisiųsti mano duomenis
        </a>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-medium text-brick transition-colors hover:bg-brick-soft"
          >
            <Trash2 className="size-4" aria-hidden />
            Ištrinti paskyrą
          </button>
        )}
      </div>

      {open && (
        <div className="mt-5 rounded-2xl bg-brick-soft p-5">
          <p className="font-medium text-brick">Ištrinti paskyrą visam laikui</p>
          <ul className="mt-2 grid gap-1 text-[0.95rem] text-haze">
            <li>Ištrinsim nustatymus, bankrollą, visus statymus ir jų istoriją, limitus ir Telegram ryšį.</li>
            <li>Jei turi prenumeratą, ji atšaukiama iš karto, o likusios apmokėtos dienos negrąžinamos.</li>
            <li>Sąskaitas faktūras Stripe saugo, nes jas privaloma saugoti apskaitai — statymų duomenų jose nėra.</li>
            <li>Atšaukti negalėsi. Jei nori kopijos, pirma atsisiųsk duomenis.</li>
          </ul>
          <label htmlFor={inputId} className="mt-4 block text-[0.9rem] text-haze">
            Patvirtink, įrašydamas savo el. paštą ({email})
          </label>
          <input
            id={inputId}
            type="email"
            autoComplete="off"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            className="mt-1.5 block h-11 w-full max-w-[24rem] rounded-xl bg-night px-3 text-chalk hairline"
          />
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={!matches || busy}
              onClick={remove}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brick px-4 font-semibold text-night transition-opacity disabled:opacity-40"
            >
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Ištrinti visam laikui
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setTyped('')
              }}
              className="min-h-11 rounded-xl px-4 font-medium text-haze hover:text-chalk"
            >
              Atšaukti
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
