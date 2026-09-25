'use client'

import { motion } from 'framer-motion'
import { Loader2, Search } from 'lucide-react'
import Link from 'next/link'
import { useId, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FaqList } from '@/components/landing/faq-list'
import { FEEDBACK_KINDS, type FeedbackKind } from '@/lib/feedback-kinds'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { EASE } from '@/lib/motion'

export type HelpItem = { q: string; a: React.ReactNode; search: string }


/** Lowercase and without Lithuanian diacritics, so "zinute" finds "žinutė". */
const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/**
 * Help inside the app: search the questions, and if the answer is not there,
 * write to us. The page the member came from travels with the note, so a bug
 * report says where it happened without asking.
 */
export function HelpView({
  items,
  from,
  guides,
}: {
  items: HelpItem[]
  from: string | null
  /** Longer reads on the public site: titles only, so the texts stay off this bundle. */
  guides: Array<{ slug: string; title: string; minutes: number }>
}) {
  const [query, setQuery] = useState('')
  const searchId = useId()
  const shown = useMemo(() => {
    const words = fold(query).split(/\s+/).filter(Boolean)
    if (!words.length) return items
    return items.filter((item) => {
      const hay = fold(`${item.q} ${item.search}`)
      return words.every((word) => hay.includes(word))
    })
  }, [items, query])

  return (
    <main className="mx-auto max-w-[48rem] px-4 pt-6 pb-16 sm:px-8 lg:pt-10">
      <h1 className="text-[2.4rem] sm:text-[3rem]">Pagalba</h1>
      <p className="mt-2 max-w-[36rem] text-haze">Atsakymai į dažniausius klausimus. Neradai? Parašyk mums apačioje.</p>

      <label htmlFor={searchId} className="sr-only">
        Ieškoti klausimų
      </label>
      <div className="relative mt-6">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-haze" aria-hidden />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="pvz. Telegram, limitas, CLV"
          className="h-12 w-full rounded-xl bg-stand pr-4 pl-12 text-chalk outline-none hairline placeholder:text-haze-dim focus:shadow-[inset_0_0_0_1.5px_var(--chalk)]"
        />
      </div>

      <section aria-label="Klausimai" className="mt-4">
        {shown.length ? (
          <FaqList key={query} items={shown} />
        ) : (
          <p className="py-8 text-haze">Pagal „{query.trim()}“ nieko neradom. Parašyk klausimą žemiau — atsakysim.</p>
        )}
      </section>

      <section aria-labelledby="gidai" className="mt-10">
        <h2 id="gidai" className="text-[1.6rem]">
          Gidai
        </h2>
        <ul className="mt-3 grid gap-2">
          {guides.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/gidai/${guide.slug}`}
                className="flex min-h-11 items-center justify-between gap-4 rounded-xl bg-stand px-4 py-3 hairline transition-colors hover:bg-stand-hover"
              >
                <span className="text-chalk">{guide.title}</span>
                <span className="shrink-0 text-[0.85rem] text-haze-dim">{guide.minutes} min.</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <FeedbackForm from={from} />
    </main>
  )
}

function FeedbackForm({ from }: { from: string | null }) {
  const reduced = useReducedMotion()
  const [kind, setKind] = useState<FeedbackKind | null>(null)
  const [message, setMessage] = useState('')
  const [contactOk, setContactOk] = useState(true)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const messageId = useId()
  const contactId = useId()

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!kind) {
      toast.error('Pasirink, apie ką rašai.')
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, message, contactOk, page: from }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error ?? 'Nepavyko išsiųsti.')
      setSent(true)
      setMessage('')
      setKind(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nepavyko išsiųsti.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="rasyti" className="mt-10 scroll-mt-20 rounded-2xl bg-stand p-5 hairline sm:p-7">
      <h2 className="text-[1.6rem]">Parašyk mums</h2>
      {sent ? (
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          role="status"
          className="mt-3"
        >
          <p>Gavom, ačiū. Kiekvieną žinutę perskaitom.</p>
          <p className="mt-1 text-[0.95rem] text-haze">
            {contactOk ? 'Jei reikės atsakymo, parašysim tavo paskyros el. paštu.' : 'Atsakymo nesiųsim, kaip prašei.'}
          </p>
          <button type="button" onClick={() => setSent(false)} className="mt-4 min-h-11 rounded-xl bg-rail px-4 font-medium hover:bg-rail-strong">
            Parašyti dar
          </button>
        </motion.div>
      ) : (
        <form onSubmit={send} className="mt-3">
          <fieldset>
            <legend className="text-[0.95rem] text-haze">Apie ką?</legend>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Žinutės tema">
              {FEEDBACK_KINDS.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  role="radio"
                  aria-checked={kind === entry.key}
                  onClick={() => setKind(entry.key)}
                  className={`min-h-10 rounded-full px-3.5 text-[0.9rem] font-medium transition-colors ${
                    kind === entry.key ? 'bg-chalk text-night' : 'bg-rail text-haze hover:text-chalk'
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label htmlFor={messageId} className="mt-5 block text-[0.95rem] text-haze">
            Žinutė
          </label>
          <textarea
            id={messageId}
            value={message}
            maxLength={2000}
            rows={5}
            required
            minLength={5}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={kind === 'bug' ? 'Ką darei, ko tikėjaisi ir kas nutiko?' : kind === 'market' ? 'Kokia sporto šaka, lyga ar rinka?' : ''}
            className="mt-1.5 block w-full rounded-xl bg-night px-3 py-2.5 text-chalk outline-none hairline placeholder:text-haze-dim focus:shadow-[inset_0_0_0_1.5px_var(--chalk)]"
          />
          {from && <p className="mt-1.5 text-[0.85rem] text-haze-dim">Kartu nusiųsim, kad rašai iš {from}.</p>}

          <label htmlFor={contactId} className="mt-4 flex cursor-pointer items-center gap-3 text-[0.95rem]">
            <input
              id={contactId}
              type="checkbox"
              checked={contactOk}
              onChange={(event) => setContactOk(event.target.checked)}
              className="size-5 shrink-0 accent-[var(--chalk)]"
            />
            Galit atsakyti mano paskyros el. paštu
          </label>

          <button
            type="submit"
            disabled={busy}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-floodlight px-5 font-semibold text-night transition-transform active:scale-[0.97] disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Siųsti
          </button>
        </form>
      )}
    </section>
  )
}
