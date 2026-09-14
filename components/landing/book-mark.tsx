import type { BookName } from '@/lib/landing-signals'

// Identification only: each book's own brand hue on a tinted chip. These
// colours never carry meaning (value, win, loss) anywhere else on the page.
const BOOK_STYLE: Record<BookName, { glyph: string; hue: string }> = {
  '7BET': { glyph: '7', hue: '#22b35e' },
  TopSport: { glyph: 'T', hue: '#e5343f' },
  Betsson: { glyph: 'b', hue: '#ff7a1a' },
}

export function BookMark({ book, size = 'md' }: { book: BookName; size?: 'sm' | 'md' }) {
  const style = BOOK_STYLE[book]
  const box = size === 'sm' ? 'size-6 text-[0.8rem]' : 'size-8 text-base'
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-md font-display font-extrabold ${box}`}
      style={{ color: style.hue, background: `color-mix(in srgb, ${style.hue} 16%, transparent)` }}
    >
      {style.glyph}
    </span>
  )
}
