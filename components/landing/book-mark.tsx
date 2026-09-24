import Image from 'next/image'
import type { BookName } from '@/lib/landing-signals'

/**
 * Each book's own app mark, taken from that book's own site (7bet.lt/icon.svg,
 * topsport.lt favicon, betsson.lt app icon) and used only to name them in a
 * price comparison. Squares, so a row of them lines up.
 */
const BOOK_LOGO: Record<BookName, { src: string; ground: string }> = {
  '7BET': { src: '/books/7bet.svg', ground: 'bg-[#242731]' },
  TopSport: { src: '/books/topsport.png', ground: 'bg-white' },
  Betsson: { src: '/books/betsson.png', ground: 'bg-[#f47b20]' },
}

export function BookMark({ book, size = 'md' }: { book: BookName; size?: 'sm' | 'md' | 'lg' }) {
  const logo = BOOK_LOGO[book]
  const box = size === 'sm' ? 'size-6' : size === 'lg' ? 'size-10' : 'size-8'
  return (
    <span aria-hidden className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-[7px] ${box} ${logo.ground}`}>
      {/* Images are unoptimized (next.config.mjs), so this is the same plain,
          lazy <img>; the box above fixes its size, so nothing shifts. */}
      <Image src={logo.src} alt="" width={40} height={40} loading="lazy" className="size-full" />
    </span>
  )
}
