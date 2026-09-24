import { NextResponse } from 'next/server'
import { isNoise, parseErrorReport } from '@/lib/error-report'
import { rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/** One browser error per request, logged as a single JSON line. Always 204. */
export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, 'csp-report')
  if (limited) return new NextResponse(null, { status: 204 })
  const report = parseErrorReport(await request.json().catch(() => null))
  if (report && !isNoise(report)) {
    console.error(
      '[client-error]',
      JSON.stringify({
        ...report,
        release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
        ua: request.headers.get('user-agent')?.slice(0, 160) ?? null,
      }),
    )
  }
  return new NextResponse(null, { status: 204 })
}
