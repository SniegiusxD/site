import type { BookName } from '@/lib/landing-signals'

const BOOK_HOSTS: Record<BookName, string> = {
  '7BET': '7bet.lt',
  TopSport: 'topsport.lt',
  Betsson: 'betsson.lt',
}

/**
 * A bookmaker URL is external, database-backed input. Only return an HTTPS
 * event link on that exact bookmaker's own domain; never render an arbitrary
 * publisher value as an href.
 */
export function safeBookEventUrl(book: BookName, value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    const root = BOOK_HOSTS[book]
    const ownHost = url.hostname === root || url.hostname.endsWith(`.${root}`)
    if (url.protocol !== 'https:' || !ownHost || url.username || url.password || url.port || url.pathname === '/') return null
    return value
  } catch {
    return null
  }
}
