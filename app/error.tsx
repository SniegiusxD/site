'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { reportError } from '@/components/error-reporter'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
    reportError('boundary', error, error.digest)
  }, [error])

  return (
    <main className="mx-auto flex min-h-dvh max-w-[36rem] flex-col justify-center px-5 py-16 sm:px-8">
      <h1 className="text-[2.6rem] sm:text-[3.2rem]">Kažkas nepavyko</h1>
      <p className="mt-3 text-haze">
        Puslapio įkelti nepavyko. Dažniausiai padeda bandyti dar kartą po kelių sekundžių.
        {error.digest && <span className="mt-2 block text-[0.85rem] text-haze-dim">Klaidos kodas: {error.digest}</span>}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="rounded-xl bg-chalk px-5 py-3 font-semibold text-night hover:bg-white">
          Bandyti dar kartą
        </button>
        <Link href="/" className="rounded-xl bg-stand px-5 py-3 font-semibold hairline hover:bg-stand-hover">
          Į pradžią
        </Link>
      </div>
    </main>
  )
}
