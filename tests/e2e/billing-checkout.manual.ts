/**
 * End-to-end billing check against Stripe TEST mode and a running dev server.
 * Not part of the CI suite: it creates a real account and a real (test)
 * subscription, and needs STRIPE_SECRET_KEY in .env.local.
 *
 *   node --env-file=.env.local --experimental-strip-types tests/e2e/billing-checkout.manual.ts
 *
 * Prints what it saw at each step and exits non-zero on the first failure.
 */
import { chromium } from '@playwright/test'
import { Pool } from 'pg'
import Stripe from 'stripe'

const ORIGIN = process.env.E2E_ORIGIN ?? 'http://localhost:3100'
const email = `e2e-check-${Date.now()}-billing@example.com`
const password = 'Slaptazodis123!'
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
const api = new Stripe(process.env.STRIPE_SECRET_KEY!)

if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  console.error('Refusing to run: this check only runs against a Stripe TEST key.')
  process.exit(2)
}

const step = (label: string, value: unknown) => console.log(`✓ ${label}:`, typeof value === 'string' ? value : JSON.stringify(value))

async function row(userId: string) {
  const { rows } = await pool.query(
    `SELECT status, "currentPeriodEnd", "cancelAtPeriodEnd", "providerCustomerId", "providerSubscriptionId", "priceId"
       FROM subscription WHERE "userId" = $1`,
    [userId],
  )
  return rows[0]
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  let exitCode = 0
  try {
    const headers = { Origin: ORIGIN, Referer: `${ORIGIN}/` }
    const up = await page.request.post(`${ORIGIN}/api/auth/sign-up/email`, { data: { email, password, name: 'E2E' }, headers })
    if (!up.ok()) throw new Error(`sign-up ${up.status()}`)
    const onboarding = await page.request.post(`${ORIGIN}/api/onboarding`, {
      data: {
        bankroll: 500, books: ['7BET', 'TopSport', 'Betsson'], minEdge: 0.02, minOdds: 1.3, maxOdds: 6,
        maxHoursToStart: 48, kellyFraction: 0.25, dailyBets: 10, bookLimits: {},
      },
      headers,
    })
    if (!onboarding.ok()) throw new Error(`onboarding ${onboarding.status()}`)
    const { rows: users } = await pool.query(`SELECT id FROM "user" WHERE email = $1`, [email])
    const userId = users[0].id as string
    step('account', email)

    // 1. From the profile to Stripe Checkout.
    await page.goto(`${ORIGIN}/profilis#prenumerata`)
    await page.getByRole('button', { name: 'Prenumeruoti', exact: true }).click()
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 })
    step('checkout opened', new URL(page.url()).host)

    // 2. Pay with the test card. Stripe's page ignores a submit made before its
    //    scripts (Link, wallets) finish loading, so wait for them first.
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(2500)
    const cardChoice = page.locator('[data-testid="card-accordion-item-button"]')
    if (await cardChoice.isVisible().catch(() => false)) await cardChoice.click()
    await page.locator('#cardNumber').fill('4242424242424242')
    await page.locator('#cardExpiry').fill('12 / 34')
    await page.locator('#cardCvc').fill('123')
    const name = page.locator('#billingName')
    if (await name.isVisible().catch(() => false)) await name.fill('E2E Tester')
    const postal = page.locator('#billingPostalCode')
    if (await postal.isVisible().catch(() => false)) await postal.fill('01001')
    // The Link button at the top is also a submit button; press the pay button by name.
    const pay = page.getByRole('button', { name: /prenumeruok|subscribe/i })
    await page.locator('#cardCvc').press('Enter')
    await page.waitForTimeout(1500)
    if (page.url().includes('checkout.stripe.com')) await pay.first().click({ delay: 120 })

    // 3. Back on the profile, confirmed without waiting for a webhook.
    await page.waitForURL(new RegExp(`${ORIGIN.replace(/[.:/]/g, '\\$&')}/profilis`), { timeout: 90_000 })
    step('returned to', new URL(page.url()).pathname + new URL(page.url()).search.slice(0, 40))
    await page.getByText(/Prenumerata aktyvi/).waitFor({ timeout: 30_000 })
    const paid = await row(userId)
    if (paid.status !== 'active' || !paid.providerSubscriptionId) throw new Error(`after checkout: ${JSON.stringify(paid)}`)
    const days = Math.round((new Date(paid.currentPeriodEnd).getTime() - Date.now()) / 86_400_000)
    step('database after checkout', { status: paid.status, periodEndInDays: days, priceId: paid.priceId })

    // 4. Full access now: the board opens without the free-tier ceiling.
    const access = await (await page.request.get(`${ORIGIN}/api/me`)).json().catch(() => null)
    step('access', access?.access?.state ?? access?.state ?? 'see /api/me')

    // 5. Cancel at period end as the portal does, then come back through the
    //    portal return path, which must re-read Stripe on its own.
    await api.subscriptions.update(paid.providerSubscriptionId, { cancel_at_period_end: true })
    await page.goto(`${ORIGIN}/profilis?billing=portal#prenumerata`)
    await page.getByText(/Prenumerata atšaukta/).waitFor({ timeout: 30_000 })
    const ending = await row(userId)
    if (ending.status !== 'canceled' || !ending.cancelAtPeriodEnd) throw new Error(`after cancel: ${JSON.stringify(ending)}`)
    step('database after cancel', { status: ending.status, cancelAtPeriodEnd: ending.cancelAtPeriodEnd })

    // 6. The portal itself opens for this customer.
    const portal = await page.request.post(`${ORIGIN}/api/billing/portal`, { headers })
    const portalBody = await portal.json()
    if (!portal.ok() || !String(portalBody.url).includes('billing.stripe.com')) throw new Error(`portal: ${JSON.stringify(portalBody)}`)
    step('portal', new URL(portalBody.url).host)

    // Clean up the Stripe side too: this was a test subscription.
    await api.subscriptions.cancel(paid.providerSubscriptionId)
    await api.customers.del(paid.providerCustomerId)
    step('stripe cleanup', 'subscription cancelled, customer deleted')
  } catch (error) {
    exitCode = 1
    console.error('✗', error instanceof Error ? error.message : error)
    await page.screenshot({ path: 'test-results/billing-failure.png', fullPage: true }).catch(() => {})
    console.error('  at', page.url())
  } finally {
    // Remove the test account and everything under it.
    const { rows } = await pool.query(`SELECT id FROM "user" WHERE email = $1`, [email])
    for (const { id } of rows) {
      for (const table of ['billing_event', 'bet_edit', 'book_limit_event', 'bankroll_entry', 'subscription', 'telegram_sent', 'telegram_preset', 'telegram_link_token', 'telegram_account', 'user_settings', 'user_bet', 'session', 'account']) {
        await pool.query(`DELETE FROM "${table}" WHERE "userId" = $1`, [id]).catch(() => {})
      }
      await pool.query(`DELETE FROM "user" WHERE id = $1`, [id])
    }
    step('test account removed', rows.length)
    await browser.close()
    await pool.end()
    process.exit(exitCode)
  }
}

void main()
