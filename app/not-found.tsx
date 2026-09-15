import Link from 'next/link'
import { brand } from '@/lib/brand'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
      <Link href="/" className="font-display text-[1.7rem] leading-none font-extrabold">
        {brand.name}
      </Link>
      <div className="mx-auto flex w-full max-w-[36rem] flex-1 flex-col justify-center py-16">
        {/* Decorative: the heading below says it in words. Steel still clears 3:1 for large text. */}
        <p aria-hidden className="font-display text-[7rem] leading-none font-extrabold text-steel">
          404
        </p>
        <h1 className="mt-4 text-[2.6rem] sm:text-[3.2rem]">Tokio puslapio nėra</h1>
        <p className="mt-3 text-haze">Nuoroda gali būti pasenusi arba su klaida adrese.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="rounded-xl bg-chalk px-5 py-3 font-semibold text-night hover:bg-white">
            Į pradžią
          </Link>
          <Link href="/signalai" className="rounded-xl bg-stand px-5 py-3 font-semibold hairline hover:bg-stand-hover">
            Į signalus
          </Link>
        </div>
      </div>
    </main>
  )
}
