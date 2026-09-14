import Link from 'next/link'
import { brand } from '@/lib/brand'

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-[76rem] items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="font-display text-[1.75rem] leading-none font-extrabold tracking-tight"
        >
          {brand.name}
        </Link>
        <nav aria-label="Pagrindinė" className="flex items-center gap-6 text-[0.95rem]">
          <a href="#kaip-veikia" className="hidden text-mist hover:text-ink sm:inline">
            Kaip veikia
          </a>
          <a href="#rezultatai" className="hidden text-mist hover:text-ink sm:inline">
            Rezultatai
          </a>
          <Link
            href="/app"
            className="rounded-[4px] bg-ink px-4 py-2 font-medium text-chalk hover:bg-slate"
          >
            Prisijungti
          </Link>
        </nav>
      </div>
    </header>
  )
}
