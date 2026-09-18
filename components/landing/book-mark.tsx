import type { BookName } from '@/lib/landing-signals'

/**
 * Each book's own mark, taken from that book's own site (7bet.lt, topsport.lt,
 * betsson.lt) and used only to name them in a price comparison. TopSport
 * publishes a wordmark rather than a square icon, so it sits on a white chip.
 */
const BOOK_LOGO: Record<BookName, { src: string; wide: boolean; ground: string }> = {
  '7BET': { src: '/books/7bet.svg', wide: false, ground: 'bg-[#242731]' },
  TopSport: { src: '/books/topsport.png', wide: true, ground: 'bg-white' },
  Betsson: { src: '/books/betsson.png', wide: false, ground: 'bg-[#f47b20]' },
}

export function BookMark({ book, size = 'md' }: { book: BookName; size?: 'sm' | 'md' | 'lg' }) {
  const logo = BOOK_LOGO[book]
  const box = size === 'sm' ? 'size-6' : size === 'lg' ? 'size-10' : 'size-8'
  return (
    <span aria-hidden className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-[7px] ${box} ${logo.ground}`}>
      <img
        src={logo.src}
        alt=""
        loading="lazy"
        decoding="async"
        className={logo.wide ? 'w-[84%]' : 'size-full'}
      />
    </span>
  )
}
