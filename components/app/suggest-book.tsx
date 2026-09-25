'use client'

import { motion } from 'framer-motion'
import { Loader2, Plus } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { SPORTS } from '@/lib/signal-taxonomy'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { EASE } from '@/lib/motion'


const COUNTRIES = [
  { value: 'LT', label: 'Lietuva' },
  { value: 'LV', label: 'Latvija' },
  { value: 'EE', label: 'Estija' },
  { value: 'other', label: 'Kita' },
] as const

/**
 * "Can't find your bookmaker?" — a short request form. It lives inside the
 * onboarding <form>, so it is a plain block with button handlers rather than a
 * nested form. A request is counted for the owner; it changes nothing else.
 */
export function SuggestBook() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]['value']>('LT')
  const [sports, setSports] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const nameId = useId()
  const reduced = useReducedMotion()
  const commentId = useId()

  async function send() {
    if (name.trim().length < 2) {
      toast.error('Įrašyk kontoros pavadinimą.')
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/book-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, country, sports, comment }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error ?? 'Nepavyko išsaugoti.')
      setSent(name.trim())
      setOpen(false)
      setName('')
      setSports([])
      setComment('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nepavyko išsaugoti.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div className="mt-3">
        {sent && (
          <motion.p
            role="status"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="mb-2 text-[0.9rem] text-haze"
          >
            Užrašėm: {sent}. Kontoras jungiam pagal tai, kiek žmonių jų prašo ir ar jų kainas galim patikimai palyginti.
          </motion.p>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-medium text-haze transition-colors hover:bg-stand hover:text-chalk"
        >
          <Plus className="size-4" aria-hidden />
          {sent ? 'Pasiūlyti dar vieną kontorą' : 'Nerandi savo kontoros? Pasiūlyk ją'}
        </button>
      </div>
    )
  }

  const chip = (active: boolean) =>
    `min-h-10 rounded-full px-3.5 text-[0.9rem] font-medium transition-colors ${active ? 'bg-chalk text-night' : 'bg-rail text-haze hover:text-chalk'}`

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: EASE }}
      className="mt-3 rounded-2xl bg-stand p-5 hairline"
    >
      <p className="font-medium">Pasiūlyk kontorą</p>
      <p className="mt-1 text-[0.9rem] text-haze">
        Kol kas lyginam 7BET, TopSport ir Betsson. Prašymas nieko neįjungia, bet parodo, kurią kontorą jungti toliau.
      </p>

      <label htmlFor={nameId} className="mt-4 block text-[0.9rem] text-haze">
        Kontoros pavadinimas
      </label>
      <input
        id={nameId}
        value={name}
        maxLength={60}
        autoComplete="off"
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          // Enter would submit the onboarding step around this block.
          if (event.key === 'Enter') {
            event.preventDefault()
            void send()
          }
        }}
        placeholder="pvz. Optibet"
        className="mt-1.5 h-11 w-full max-w-[22rem] rounded-xl bg-night px-3 text-chalk outline-none hairline placeholder:text-haze-dim focus:shadow-[inset_0_0_0_1.5px_var(--chalk)]"
      />

      <fieldset className="mt-4">
        <legend className="text-[0.9rem] text-haze">Šalis</legend>
        <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Šalis">
          {COUNTRIES.map((option) => (
            <button key={option.value} type="button" role="radio" aria-checked={country === option.value} onClick={() => setCountry(option.value)} className={chip(country === option.value)}>
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-[0.9rem] text-haze">Kokias sporto šakas ten statai? Nebūtina.</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {SPORTS.map((sport) => {
            const on = sports.includes(sport.key)
            return (
              <button
                key={sport.key}
                type="button"
                aria-pressed={on}
                onClick={() => setSports((current) => (on ? current.filter((key) => key !== sport.key) : [...current, sport.key]))}
                className={chip(on)}
              >
                {sport.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <label htmlFor={commentId} className="mt-4 block text-[0.9rem] text-haze">
        Komentaras. Nebūtina.
      </label>
      <textarea
        id={commentId}
        value={comment}
        maxLength={500}
        rows={2}
        onChange={(event) => setComment(event.target.value)}
        className="mt-1.5 block w-full rounded-xl bg-night px-3 py-2.5 text-chalk outline-none hairline focus:shadow-[inset_0_0_0_1.5px_var(--chalk)]"
      />

      <div className="mt-4 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={send}
          disabled={busy}
          className="kr-press inline-flex min-h-11 items-center gap-2 rounded-xl bg-chalk px-4 font-semibold text-night disabled:opacity-60"
        >
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Siųsti pasiūlymą
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-xl px-4 font-medium text-haze hover:text-chalk">
          Atšaukti
        </button>
      </div>
    </motion.div>
  )
}
