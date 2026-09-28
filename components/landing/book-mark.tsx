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
  const box = size === 'sm' ? 'size-6' : size === 'lg' ? 'size-10' : 'size-8'
  // Drawn as SVG text: the mark is decorative (the name is written next to it)
  // and sits inside cards that are deliberately faded in stacks.
  return (
    <svg
      aria-hidden
      viewBox="0 0 32 32"
      className={`shrink-0 rounded-[7px] bg-night hairline ${box}`}
      style={tinted ? { boxShadow: `inset 0 0 0 1.5px ${BOOK_ACCENT[book]}` } : undefined}
    >
      <text
        x="16"
        y="16"
        dominantBaseline="central"
        textAnchor="middle"
        className="fill-chalk font-semibold"
        style={{ fontSize: 12, letterSpacing: '-0.02em', ...(tinted ? { fill: BOOK_ACCENT[book] } : {}) }}
      >
        {BOOK_INITIALS[book]}
      </text>
    </svg>
  )
}
