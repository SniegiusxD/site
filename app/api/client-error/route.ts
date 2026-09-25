import { NextResponse } from 'next/server'
import { isNoise, parseErrorReport } from '@/lib/error-report'
import { recordError, releaseTag } from '@/lib/error-store'
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
        release: releaseTag(),
        ua: request.headers.get('user-agent')?.slice(0, 160) ?? null,
      }),
    )
    // The log line lasts an hour on Hobby; the stored copy is what the owner page reads.
    await recordError({
      source: 'client',
      kind: report.kind,
      message: report.message,
      stack: report.stack,
      where: report.path,
      release: releaseTag(),
    })
  }
  return new NextResponse(null, { status: 204 })
}
