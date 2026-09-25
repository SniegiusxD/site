import { NextResponse } from 'next/server'
import { loadHealth } from '@/lib/health'
import { rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * Public liveness for monitors: 200 when the database answers, the scanner
 * published within 90 minutes and results are still arriving (see lib/health),
 * 503 otherwise with the problem named. Carries only timestamps.
 */
export async function GET(request: Request) {
  const limited = await rateLimitResponse(request, 'expensive-read')
  if (limited) return limited
  const health = await loadHealth()
  return NextResponse.json(health, { status: health.ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } })
}
