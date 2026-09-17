import Link from 'next/link'
import { redirect } from 'next/navigation'
import { HeroBoard } from '@/components/landing/hero-board'
import { brand } from '@/lib/brand'
import { getSessionUser } from '@/lib/session'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getSessionUser()) redirect('/signalai')

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <header>
          <Link href="/" className="font-display text-[1.7rem] leading-none font-extrabold">
            {brand.name}
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[25rem]">{children}</div>
        </main>
        <footer className="text-[0.85rem] text-haze-dim">Tik nuo 18 metų. Lošimas gali sukelti priklausomybę.</footer>
      </div>
      <aside className="relative hidden overflow-hidden border-l border-rail bg-night-deep lg:flex lg:items-center lg:justify-center lg:p-12">
        <div
          aria-hidden
          className="kr-stripes pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_0%,#000,transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgb(91_229_132/0.10),transparent_70%)]"
        />
        <div className="relative w-full max-w-[36rem]">
          <p className="mb-5 text-haze">Taip atrodo signalai viduje.</p>
          <HeroBoard stats={null} />
        </div>
      </aside>
    </div>
  )
}
