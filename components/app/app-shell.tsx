'use client'

import NumberFlow from '@number-flow/react'
import { Activity, LifeBuoy, LogOut, ReceiptText, UserRound } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { brand } from '@/lib/brand'
import { ltPlural } from '@/lib/format-lt'
import { useAccount } from './account-provider'
import { BankrollDialog } from './bankroll-dialog'

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { account, email } = useAccount()
  const [bankrollOpen, setBankrollOpen] = useState(false)
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
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={hrefFrom(href, pathname)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-colors ${
                  active ? 'bg-stand text-chalk' : 'text-haze hover:bg-stand/60 hover:text-chalk'
                }`}
              >
                <Icon className="size-5" aria-hidden />
                {label}
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
              Sumos: {KELLY_NAME[account.preferences.kellyFraction] ?? 'Kelly'}
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

      <div className="min-w-0 pb-24 lg:pb-0">{children}</div>

      {/* Phone bottom navigation */}
      <nav
        aria-label="Programėlė"
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-rail bg-night/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        style={{ gridTemplateColumns: `repeat(${NAV.length}, minmax(0, 1fr))` }}
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={hrefFrom(href, pathname)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[0.75rem] font-medium ${active ? 'text-chalk' : 'text-haze-dim'}`}
            >
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
