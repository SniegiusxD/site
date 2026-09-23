import { describe, expect, it } from 'vitest'

import nextConfig from '../../next.config.mjs'
import { POST as reportCspViolation } from '@/app/api/csp-report/route'
import { productionDatabaseUrl } from '@/lib/runtime-config'

describe('production security configuration', () => {
  it('sets baseline security headers and report-only CSP globally', async () => {
    const rules = await nextConfig.headers!()
    const global = rules.find((rule) => rule.source === '/(.*)')
    const headers = new Map(global?.headers.map(({ key, value }) => [key, value]))

    expect(headers.get('Strict-Transport-Security')).toContain('max-age=31536000')
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
    expect(headers.get('Content-Security-Policy-Report-Only')).toContain("frame-ancestors 'self'")
    expect(headers.get('Content-Security-Policy-Report-Only')).toContain('report-uri /api/csp-report')
  })

  it('requires certificate verification for the production database', () => {
    expect(productionDatabaseUrl(
      'postgresql://user:pass@db.example/app?sslmode=require',
      true,
    )).toBe('postgresql://user:pass@db.example/app?sslmode=verify-full')
  })

  it('does not force TLS parameters onto local development databases', () => {
    expect(productionDatabaseUrl('postgresql://localhost/app', false))
      .toBe('postgresql://localhost/app')
  })

  it('bounds CSP violation reports before parsing them', async () => {
    const response = await reportCspViolation(new Request(
      'https://example.com/api/csp-report',
      {
        method: 'POST',
        headers: { 'content-length': '20000' },
        body: '{}',
      },
    ))

    expect(response.status).toBe(413)
  })
})
