'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { brand } from '@/lib/brand'

const LINKS = [
  { href: '#kaip-veikia', label: 'Kaip veikia' },
  { href: '#funkcijos', label: 'Funkcijos' },
  { href: '#rezultatai', label: 'Rezultatai' },
  { href: '#kaina', label: 'Kaina' },
]

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
        scrolled
          ? 'bg-night/80 shadow-[0_1px_0_0_var(--rail)] backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[80rem] items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="font-display text-[1.7rem] leading-none font-extrabold">
          {brand.name}
        </Link>
        <nav aria-label="Pagrindinė" className="hidden items-center gap-8 text-[0.95rem] lg:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-haze transition-colors hover:text-chalk">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/prisijungti"
            className="rounded-lg px-3 py-2 text-[0.95rem] text-haze transition-colors hover:text-chalk"
          >
            Prisijungti
          </Link>
          <Link
            href="/registracija"
            className="rounded-lg bg-chalk px-4 py-2 text-[0.95rem] font-semibold text-night transition-transform duration-200 hover:bg-white active:scale-[0.97]"
          >
            <span className="sm:hidden">Išbandyti</span>
            <span className="hidden sm:inline">Išbandyti nemokamai</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
