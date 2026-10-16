import Image from 'next/image'
import type { BookName } from '@/lib/landing-signals'

/**
 * Each book's own app mark, taken from that book's own site (7bet.lt/icon.svg,
 * topsport.lt favicon, betsson.lt app icon). Restored 2026-10-16 at the owner's
 * request after the 09-25 removal; the owner does not treat the LPT ad guidance
 * as a blocker. Squares of fixed size, so a row of them lines up.
 */
const BOOK_LOGO: Record<BookName, { src: string; ground: string }> = {
  '7BET': { src: '/books/7bet.svg', ground: 'bg-[#242731]' },
  TopSport: { src: '/books/topsport.png', ground: 'bg-white' },
  Betsson: { src: '/books/betsson.png', ground: 'bg-[#f47b20]' },
}

/**
 * Each book's own accent, for the members' app only (board rows, bets): it
 * tells books apart at a glance. Never the only cue — the initials and the
 * written name stay. Brightened from the books' own colours (7BET yellow on
 * navy, TopSport blue #0056a1, Betsson orange) so each reads on `night`.
 * Public pages keep the neutral mark (t190).
 */
export const BOOK_ACCENT: Record<BookName, string> = {
  '7BET': '#f2c230',
  TopSport: '#3b8ae6',
  Betsson: '#ff7a1a',
}

export function BookMark({ book, size = 'md', tinted = false }: { book: BookName; size?: 'sm' | 'md' | 'lg'; tinted?: boolean }) {
  const logo = BOOK_LOGO[book]
  const box = size === 'sm' ? 'size-6' : size === 'lg' ? 'size-10' : 'size-8'
  // Decorative: the book's name is always written next to the mark.
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-[7px] ${box} ${logo.ground}`}
      style={tinted ? { boxShadow: `0 0 0 1.5px ${BOOK_ACCENT[book]}` } : undefined}
    >
      {/* Images are unoptimized (next.config.mjs), so this renders a plain lazy <img>; the box fixes its size. */}
      <Image src={logo.src} alt="" width={40} height={40} loading="lazy" className="size-full" />
    </span>
  )
}
