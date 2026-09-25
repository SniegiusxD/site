'use client'

import { Loader2, PauseCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { PAUSE_OPTIONS, type PauseDays } from '@/lib/self-pause'

const until = (iso: string) =>
  new Date(iso).toLocaleString('lt-LT', {
    timeZone: 'Europe/Vilnius',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

/**
 * A break the member sets for themselves. Two steps (choose, then confirm),
 * because it cannot be cut short once it starts.
 */
export function PauseCard({ pausedUntil }: { pausedUntil: string | null }) {
  const router = useRouter()
  const [choice, setChoice] = useState<PauseDays | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState(pausedUntil)

  async function confirm() {
    if (!choice) return
    setPending(true)
    setError(null)
    try {
      const response = await fetch('/api/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: choice }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        setError(body?.error ?? 'Nepavyko įjungti pertraukos. Bandyk dar kartą.')
        return
      }
      setCurrent(body.pausedUntil)
      setChoice(null)
      toast.success(`Pertrauka įjungta iki ${until(body.pausedUntil)}.`)
      router.refresh()
    } catch {
      setError('Nėra ryšio. Bandyk dar kartą.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      {current ? (
        <p className="flex items-start gap-2 text-chalk">
          <PauseCircle className="mt-0.5 size-5 shrink-0 text-floodlight" aria-hidden />
          <span>
            Pertrauka iki <strong>{until(current)}</strong>. Iki tol signalų nerodom nei čia, nei Telegram. Anksčiau jos
            nutraukti negalima.
          </span>
        </p>
      ) : (
        <p className="text-haze">
          Jei nori atsitraukti, užrakink signalus sau. Pertraukos metu jų nerodom nei svetainėje, nei Telegram, o
          pradėtos pertraukos sutrumpinti negalima. Statymų žurnalas lieka pasiekiamas.
        </p>
      )}

      <div role="radiogroup" aria-label="Pertraukos trukmė" className="mt-4 flex flex-wrap gap-2">
        {PAUSE_OPTIONS.map((option) => (
          <button
            key={option.days}
            type="button"
            role="radio"
            aria-checked={choice === option.days}
            onClick={() => setChoice(option.days)}
            className={`rounded-xl px-4 py-2.5 font-medium transition-colors hairline ${
              choice === option.days ? 'bg-floodlight text-night' : 'bg-night/60 text-chalk hover:bg-rail'
            }`}
          >
            {current ? `Pratęsti: ${option.label}` : option.label}
          </button>
        ))}
      </div>

      {choice && (
        <div className="mt-4 rounded-xl bg-night/60 p-4 hairline">
          <p className="text-chalk">
            Tikrai? {PAUSE_OPTIONS.find((option) => option.days === choice)?.label} be signalų. Nutraukti anksčiau nebus
            galima.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={confirm}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl bg-floodlight px-4 py-2.5 font-semibold text-night disabled:opacity-60"
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Įjungti pertrauką
            </button>
            <button type="button" onClick={() => setChoice(null)} className="rounded-xl px-4 py-2.5 text-haze hover:text-chalk">
              Atšaukti
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-brick">
          {error}
        </p>
      )}
      <p className="mt-4 text-[0.9rem] text-haze-dim">
        Ilgesniam laikui galima apriboti sau galimybę lošti visose Lietuvos bendrovėse per Lošimų priežiūros tarnybą
        (lpt.lrv.lt).
      </p>
    </div>
  )
}
