'use client'

import NumberFlow from '@number-flow/react'
import { motion } from 'framer-motion'
import { Activity, Gauge, LifeBuoy, LogOut, ReceiptText, UserRound } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { brand } from '@/lib/brand'
import { formatEuro, ltPlural } from '@/lib/format-lt'
import { SPRING } from '@/lib/motion'
import { useAccount } from './account-provider'
import { BankrollDialog } from './bankroll-dialog'
import { ConnectionBanner } from './connection-banner'
import { useNavTransition } from './use-nav-transition'

const NAV = [
  { href: '/signalai', label: 'Signalai', icon: Activity },
  { href: '/statymai', label: 'Statymai', icon: ReceiptText },
  { href: '/profilis', label: 'Profilis', icon: UserRound },
  { href: '/pagalba', label: 'Pagalba', icon: LifeBuoy },
]

/** Help carries the page it was opened from, so a bug report says where it happened. */
const hrefFrom = (href: string, pathname: string) =>
  href === '/pagalba' && !pathname.startsWith('/pagalba') ? `/pagalba?is=${encodeURIComponent(pathname)}` : href

const KELLY_NAME: Record<number, string> = { 0.125: '⅛ Kelly', 0.25: '¼ Kelly', 0.5: '½ Kelly' }

/** Only for OWNER_EMAILS; decided on the server, the page itself checks again. */
const OWNER_LINK = { href: '/savininkas', label: 'Savininkas', icon: Gauge }

export function AppShell({ children, owner = false }: { children: React.ReactNode; owner?: boolean }) {
  const nav = useMemo(() => (owner ? [...NAV, OWNER_LINK] : NAV), [owner])
  const pathname = usePathname()
  const router = useRouter()
  const { account, email } = useAccount()
  const [bankrollOpen, setBankrollOpen] = useState(false)
  const order = useMemo(() => nav.map((item) => item.href), [nav])
  const navigate = useNavTransition(order)
  const closeBankroll = useCallback(() => setBankrollOpen(false), [])

  const access = account.access
  const trialNote =
    access.state === 'trial'
      ? `Bandymas: liko ${access.daysLeft} ${ltPlural(access.daysLeft, 'diena', 'dienos', 'dienų')}`
      : access.state === 'ending'
        ? `Prenumerata baigsis po ${access.daysLeft} d.`
        : null

  async function signOut() {
    await authClient.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="app-dense min-h-dvh lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-rail bg-night-deep px-4 py-6 lg:flex">
        <Link href="/signalai" className="px-3 font-display text-[1.7rem] leading-none font-extrabold">
          {brand.name}
        </Link>
        <nav aria-label="Programėlė" className="mt-10 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={hrefFrom(href, pathname)}
                onClick={(event) => navigate(event, hrefFrom(href, pathname))}
                aria-current={active ? 'page' : undefined}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-colors ${
                  active ? 'text-chalk' : 'text-haze hover:bg-stand/60 hover:text-chalk'
                }`}
              >
                {/* The highlight slides to the new page instead of blinking there. */}
                {active && <motion.span layoutId="nav-desktop" aria-hidden className="absolute inset-0 rounded-xl bg-stand" transition={SPRING.snappy} />}
                <Icon className="relative size-5" aria-hidden />
                <span className="relative">{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto space-y-3">
          {trialNote && (
            <p className="rounded-xl bg-pitch-soft px-3 py-2 text-[0.85rem] font-medium text-pitch">{trialNote}</p>
          )}
          {access.tier === 'free' && (
            <Link
              href="/atrakinti"
              className="flex items-center justify-between gap-2 rounded-xl bg-stand px-3 py-2.5 text-[0.85rem] font-medium hairline transition-colors hover:bg-stand-hover"
            >
              <span className="text-haze">Nemokamas planas</span>
              <span className="text-floodlight">Atrakinti</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setBankrollOpen(true)}
            className="block w-full rounded-2xl bg-stand p-4 text-left hairline transition-colors hover:bg-stand-hover"
          >
            <span className="flex items-center justify-between text-[0.85rem] text-haze">
              Bankrollas
              <span className="text-chalk underline decoration-rail-strong underline-offset-4">Keisti</span>
            </span>
            <span className="mt-1 block font-display text-3xl font-bold tnum">
              <NumberFlow value={account.bankroll.current} locales="lt-LT" format={{ maximumFractionDigits: 0 }} suffix=" €" />
            </span>
            <span className="mt-1 block text-[0.8rem] text-haze-dim">
              Sumos:{' '}
              {account.preferences.fixedStake
                ? `po ${formatEuro(account.preferences.fixedStake)}`
                : (KELLY_NAME[account.preferences.kellyFraction] ?? 'Kelly')}
            </span>
          </button>
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="truncate text-[0.85rem] text-haze-dim">{email}</p>
            <button
              type="button"
              onClick={signOut}
              aria-label="Atsijungti"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-haze hover:bg-stand hover:text-chalk"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-rail bg-night/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href="/signalai" className="font-display text-[1.5rem] leading-none font-extrabold">
          {brand.name}
        </Link>
        <button
          type="button"
          onClick={() => setBankrollOpen(true)}
          className="rounded-full bg-stand px-3.5 py-1.5 text-[0.95rem] font-semibold hairline"
          aria-label={`Bankrollas ${Math.round(account.bankroll.current)} €. Keisti`}
        >
          <NumberFlow value={account.bankroll.current} locales="lt-LT" format={{ maximumFractionDigits: 0 }} suffix=" €" />
        </button>
      </header>

      {/* Phones have no sidebar: the trial countdown lives here instead. */}
      {trialNote && (
        <Link
          href={access.state === 'trial' ? '/atrakinti' : '/profilis#prenumerata'}
          className="flex items-center justify-between gap-3 border-b border-rail bg-pitch-soft px-4 py-2 text-[0.875rem] font-medium text-pitch lg:hidden"
        >
          <span>{trialNote}</span>
          <span className="underline underline-offset-4">{access.state === 'trial' ? 'Tęsti po bandymo' : 'Prenumerata'}</span>
        </Link>
      )}

      <ConnectionBanner />
      <div data-app-main className="min-w-0 pb-24 lg:pb-0" style={{ viewTransitionName: 'app-main' }}>
        {children}
      </div>

      {/* Phone bottom navigation */}
      <nav
        aria-label="Programėlė"
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-rail bg-night/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
      >
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={hrefFrom(href, pathname)}
              onClick={(event) => navigate(event, hrefFrom(href, pathname))}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[0.75rem] font-medium transition-colors ${active ? 'text-chalk' : 'text-haze-dim'}`}
            >
              {active && (
                <motion.span
                  layoutId="app-nav-indicator"
                  transition={SPRING.snappy}
                  aria-hidden
                  className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-pitch"
                />
              )}
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          )
        })}
      </nav>

      <BankrollDialog open={bankrollOpen} onClose={closeBankroll} />
    </div>
  )
}
