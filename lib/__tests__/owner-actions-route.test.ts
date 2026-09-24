import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  user: null as null | { id: string; email: string },
  owner: false,
  limited: null as Response | null,
  applied: [] as unknown[][],
}))

vi.mock('@/lib/session', () => ({ getSessionUser: async () => state.user }))
vi.mock('@/lib/owner', () => ({ isOwner: () => state.owner }))
vi.mock('@/lib/rate-limit', () => ({ rateLimitResponse: async () => state.limited }))
vi.mock('@/lib/admin-actions', async (original) => {
  const actual = await original<typeof import('@/lib/admin-actions')>()
  return {
    ...actual,
    applyOwnerMutation: async (...args: unknown[]) => {
      state.applied.push(args)
      return { auditId: 'audit-1', access: { state: 'active', tier: 'full', hasAccess: true } }
    },
  }
})

const request = (body: unknown) => new Request('http://localhost/api/owner/users/member-1/grant', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})
const context = (action = 'grant') => ({ params: Promise.resolve({ id: 'member-1', action }) })

describe('owner user actions route', () => {
  beforeEach(() => {
    state.user = null
    state.owner = false
    state.limited = null
    state.applied.length = 0
  })

  it('is a 404 and does not mutate for anyone except an owner', async () => {
    const { POST } = await import('@/app/api/owner/users/[id]/[action]/route')
    const response = await POST(request({ reason: 'support', until: '2026-10-01T00:00:00Z' }), context())
    expect(response.status).toBe(404)
    expect(state.applied).toEqual([])
  })

  it('rate limits the authenticated owner action', async () => {
    state.user = { id: 'owner-1', email: 'owner@example.lt' }
    state.owner = true
    state.limited = new Response('limited', { status: 429 })
    const { POST } = await import('@/app/api/owner/users/[id]/[action]/route')
    expect((await POST(request({ reason: 'support', until: '2026-10-01T00:00:00Z' }), context())).status).toBe(429)
    expect(state.applied).toEqual([])
  })

  it('validates and applies an owner grant with the actor identity', async () => {
    state.user = { id: 'owner-1', email: 'owner@example.lt' }
    state.owner = true
    const { POST } = await import('@/app/api/owner/users/[id]/[action]/route')
    const response = await POST(request({ reason: ' support case ', until: '2026-10-01T00:00:00Z' }), context())
    expect(response.status).toBe(200)
    expect(state.applied).toHaveLength(1)
    expect(state.applied[0][0]).toBe('member-1')
    expect(state.applied[0][1]).toBe('owner@example.lt')
    expect(state.applied[0][2]).toMatchObject({ action: 'grant', reason: 'support case' })
  })
})
