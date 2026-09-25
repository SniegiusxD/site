import type { BookName } from '@/lib/landing-signals'

/**
 * A neutral short mark for a book: letters on our own surface, never the book's
 * logo. Lithuanian law allows an operator's trademark only in its own narrow ad
 * format (LPT guidance 2025-06-30), so the logos were removed on 2026-09-25.
 * Squares of fixed size, so a row of them lines up and nothing shifts.
 */
const BOOK_INITIALS: Record<BookName, string> = {
  '7BET': '7B',
  TopSport: 'TS',
  Betsson: 'BS',
}

export function BookMark({ book, size = 'md' }: { book: BookName; size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'sm' ? 'size-6' : size === 'lg' ? 'size-10' : 'size-8'
  // Drawn as SVG text: the mark is decorative (the name is written next to it)
  // and sits inside cards that are deliberately faded in stacks.
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={`shrink-0 rounded-[7px] bg-night hairline ${box}`}>
      <text
        x="16"
        y="16"
        dominantBaseline="central"
        textAnchor="middle"
        className="fill-chalk font-semibold"
        style={{ fontSize: 12, letterSpacing: '-0.02em' }}
      >
        {BOOK_INITIALS[book]}
      </text>
    </svg>
  )
}
