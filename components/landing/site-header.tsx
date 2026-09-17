'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { brand } from '@/lib/brand'

// Absolute, so the header also works on other public pages such as the calculator.
const LINKS = [
  { href: '/#kaip', label: 'Kaip tai veikia' },
  { href: '/#duomenys', label: 'Duomenys' },
  { href: '/skaiciuokle', label: 'Skaičiuoklė' },
  { href: '/#kaina', label: 'Kaina' },
]

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`kr-fade fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-200 ${
        scrolled ? 'bg-night/85 shadow-[inset_0_-1px_0_var(--rail)] backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[80rem] items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="flex min-h-11 items-center font-display text-[1.375rem] font-extrabold tracking-[-0.03em]">
          {brand.name}
        </Link>
        <nav aria-label="Pagrindinė" className="ml-2 hidden flex-1 items-center gap-6 lg:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-11 items-center text-[0.9375rem] font-medium whitespace-nowrap text-haze transition-colors hover:text-chalk"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-3 lg:ml-0">
          <Link
            href="/prisijungti"
            className="flex min-h-11 items-center px-2 text-[0.9375rem] font-medium whitespace-nowrap text-haze transition-colors hover:text-chalk"
          >
            Prisijungti
          </Link>
          <Link
            href="/registracija"
            className="flex min-h-11 items-center rounded-[14px] bg-floodlight px-4 text-[0.9375rem] font-semibold whitespace-nowrap text-night transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97] sm:px-[18px]"
          >
            <span className="sm:hidden">Išbandyti</span>
            <span className="hidden sm:inline">Išbandyti 7 dienas</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
