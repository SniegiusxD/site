import Stripe from 'stripe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const SECRET = 'whsec_test_secret'

const calls = vi.hoisted(() => ({
  claimed: new Set<string>(),
  released: [] as string[],
  synced: [] as Array<{ sub: string; user: string | null }>,
  failSync: false,
}))

vi.mock('@/lib/billing/store', () => ({
  claimEvent: async (id: string) => {
    if (calls.claimed.has(id)) return false
    calls.claimed.add(id)
    return true
  },
  releaseEvent: async (id: string) => {
    calls.released.push(id)
    calls.claimed.delete(id)
  },
}))

vi.mock('@/lib/billing/sync', () => ({
  syncSubscription: async (_api: unknown, sub: string, user: string | null) => {
    if (calls.failSync) throw new Error('stripe down')
    calls.synced.push({ sub, user })
    return { userId: user, applied: true }
  },
}))

const signer = new Stripe('sk_test_dummy')

function signedRequest(event: object, secret = SECRET) {
  const payload = JSON.stringify(event)
  const header = signer.webhooks.generateTestHeaderString({ payload, secret })
  return new Request('http://localhost/api/billing/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': header, 'content-type': 'application/json' },
    body: payload,
  })
}

const event = (id: string, type: string, object: object) => ({ id, type, object: 'event', data: { object } })

describe('billing webhook', () => {
  let POST: (request: Request) => Promise<Response>

  beforeEach(async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
    process.env.STRIPE_WEBHOOK_SECRET = SECRET
    calls.claimed.clear()
    calls.released.length = 0
    calls.synced.length = 0
    calls.failSync = false
    vi.resetModules()
    ;({ POST } = await import('@/app/api/billing/webhook/route'))
  })

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
  })

  it('refuses a request signed with another secret', async () => {
    const response = await POST(signedRequest(event('evt_1', 'invoice.paid', {}), 'whsec_wrong'))
    expect(response.status).toBe(400)
    expect(calls.synced).toEqual([])
  })

  it('syncs the subscription a completed checkout created, for the member who paid', async () => {
    const response = await POST(
      signedRequest(event('evt_2', 'checkout.session.completed', { subscription: 'sub_A', client_reference_id: 'user-1' })),
    )
    expect(response.status).toBe(200)
    expect(calls.synced).toEqual([{ sub: 'sub_A', user: 'user-1' }])
  })

  it('finds the subscription of an invoice under parent, as API 2026-08-26 sends it', async () => {
    await POST(
      signedRequest(
        event('evt_3', 'invoice.payment_failed', { parent: { subscription_details: { subscription: 'sub_B' } } }),
      ),
    )
    expect(calls.synced).toEqual([{ sub: 'sub_B', user: null }])
  })

  it('does nothing the second time Stripe delivers the same event', async () => {
    const same = event('evt_4', 'customer.subscription.updated', { id: 'sub_C' })
    await POST(signedRequest(same))
    const second = await POST(signedRequest(same))
    expect((await second.json()).duplicate).toBe(true)
    expect(calls.synced).toHaveLength(1)
  })

  it('ignores event types it does not handle', async () => {
    const response = await POST(signedRequest(event('evt_5', 'customer.created', { id: 'cus_1' })))
    expect((await response.json()).ignored).toBe('customer.created')
    expect(calls.claimed.has('evt_5')).toBe(false)
  })

  it('gives the claim back when the handler fails, so the retry can run', async () => {
    calls.failSync = true
    const response = await POST(signedRequest(event('evt_6', 'customer.subscription.deleted', { id: 'sub_D' })))
    expect(response.status).toBe(500)
    expect(calls.released).toEqual(['evt_6'])
  })

  it('answers 503 when billing is not configured', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    vi.resetModules()
    const { POST: unconfigured } = await import('@/app/api/billing/webhook/route')
    const response = await unconfigured(signedRequest(event('evt_7', 'invoice.paid', {})))
    expect(response.status).toBe(503)
  })
})
