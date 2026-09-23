import { NextResponse } from 'next/server'
import { rateLimitResponse } from '@/lib/rate-limit'

const MAX_REPORT_BYTES = 16_384

function safeLocation(value: unknown) {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    return `${url.origin}${url.pathname}`.slice(0, 500)
  } catch {
    return undefined
  }
}

export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, 'csp-report')
  if (limited) return limited
  const announced = Number(request.headers.get('content-length') ?? 0)
  if (announced > MAX_REPORT_BYTES) {
    return NextResponse.json({ error: 'Ataskaita per didelė.' }, { status: 413 })
  }

  const text = await request.text()
  if (Buffer.byteLength(text, 'utf8') > MAX_REPORT_BYTES) {
    return NextResponse.json({ error: 'Ataskaita per didelė.' }, { status: 413 })
  }

  try {
    const body = JSON.parse(text) as Record<string, unknown>
    const report = (body['csp-report'] ?? body.body ?? body) as Record<string, unknown>
    console.warn('[csp-report]', {
      directive: String(report['violated-directive'] ?? report.effectiveDirective ?? '').slice(0, 100),
      document: safeLocation(report['document-uri'] ?? report.documentURL),
      blocked: safeLocation(report['blocked-uri'] ?? report.blockedURL),
    })
  } catch {
    return NextResponse.json({ error: 'Netinkama ataskaita.' }, { status: 400 })
  }

  return new NextResponse(null, { status: 204 })
}
