import { unstable_cache } from 'next/cache'
import { NextResponse } from 'next/server'
import { marketFamilyOf, summarize } from '@/lib/public-results'
import { loadPastSignals } from '@/lib/public-results-store'
import { rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/** The same record /rezultatai shows, read at most every 10 minutes. */
const pastSignals = unstable_cache(async () => (await loadPastSignals()) ?? [], ['public-record'], { revalidate: 600 })

/**
 * How past signals like this one did: same sport, market family and book.
 * Public data (it is all on /rezultatai), so no account is needed; a signal
 * detail asks for it to put the current price in context.
 */
export async function GET(request: Request) {
  const limited = await rateLimitResponse(request, 'expensive-read')
  if (limited) return limited
  const params = new URL(request.url).searchParams
  const sport = params.get('sport') ?? ''
  const market = params.get('market') ?? ''
  const book = params.get('book') ?? ''
  if (![sport, market, book].every((value) => /^[\w-]{1,40}$/.test(value))) {
    return NextResponse.json({ error: 'Netinkama užklausa.' }, { status: 400 })
  }
  try {
    const family = marketFamilyOf(market)
    const similar = (await pastSignals()).filter(
      (signal) => signal.sport === sport && signal.book === book && marketFamilyOf(signal.market) === family,
    )
    return NextResponse.json({ family, ...summarize(similar) }, { headers: { 'Cache-Control': 'private, max-age=300' } })
  } catch (error) {
    console.error('[api/record-context]', error)
    return NextResponse.json({ error: 'Nepavyko gauti istorijos.' }, { status: 500 })
  }
}
