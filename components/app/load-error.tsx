'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { errorAdvice } from '@/lib/api-error'
import type { ApiError } from '@/lib/use-api'

/**
 * What a screen shows when its data did not load: one sentence from
 * errorAdvice, and the one action that helps (try again, or sign in when the
 * session is gone). Never a blank area or an endless spinner.
 */
export function LoadError({
  error,
  what,
  onRetry,
  retrying = false,
  className = '',
}: {
  error: ApiError
  /** What did not load, in the genitive: "statymų", "kainos istorijos". */
  what: string
  onRetry?: () => void
  /** A retry is on its way: the button waits. */
  retrying?: boolean
  className?: string
}) {
  const advice = errorAdvice(error, what)
  return (
    <div role="alert" className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-brick-soft px-4 py-3 text-[0.9rem] text-brick ${className}`}>
      <p className="flex min-w-0 flex-1 basis-60 items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{advice.message}</span>
      </p>
      {advice.signIn ? (
        <Link href="/prisijungti" className="kr-press inline-flex min-h-10 items-center rounded-lg bg-chalk px-3 font-semibold text-night">
          Prisijungti
        </Link>
      ) : (
        advice.retry &&
        onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="kr-press inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-chalk px-3 font-semibold text-night disabled:opacity-60"
          >
            <RotateCcw className={`size-4 ${retrying ? 'animate-spin' : ''}`} aria-hidden />
            {retrying ? 'Bandom…' : 'Bandyti dar kartą'}
          </button>
        )
      )}
    </div>
  )
}
