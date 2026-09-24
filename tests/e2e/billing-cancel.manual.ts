/**
 * Cancel and resume from the profile, against Stripe TEST mode: a member with a
 * live test subscription cancels with a reason (cancel_at_period_end + feedback
 * in Stripe), then resumes. Deletes its account and Stripe customer after.
 *
 *   node --env-file=.env.local --experimental-strip-types tests/e2e/billing-cancel.manual.ts
 */
import { chromium, request as pr } from '@playwright/test'
import { Pool } from 'pg'
import Stripe from 'stripe'
const ORIGIN = process.env.E2E_ORIGIN ?? 'http://localhost:3100'
const email = `e2e-check-${Date.now()}-cancel@example.com`
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
const api = new Stripe(process.env.STRIPE_SECRET_KEY!)
async function main() {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw new Error('test key only')
  const http = await pr.newContext({ baseURL: ORIGIN, extraHTTPHeaders: { Origin: ORIGIN, Referer: `${ORIGIN}/` } })
  const b = await chromium.launch()
  let customerId = ''
  try {
    await http.post('/api/auth/sign-up/email', { data: { email, password: 'Slaptazodis123!', name: 'E' } })
    await http.post('/api/onboarding', { data: { bankroll: 500, books: ['7BET', 'TopSport', 'Betsson'], minEdge: 0.02, minOdds: 1.3, maxOdds: 6, maxHoursToStart: 48, kellyFraction: 0.25, dailyBets: 10, bookLimits: {} } })
    const uid = (await pool.query('SELECT id FROM "user" WHERE email=$1', [email])).rows[0].id
    const c = await api.customers.create({ email, metadata: { userId: uid } }); customerId = c.id
    const pm = await api.paymentMethods.attach('pm_card_visa', { customer: c.id })
    await api.customers.update(c.id, { invoice_settings: { default_payment_method: pm.id } })
    const price = (await api.prices.list({ lookup_keys: ['statyk_all_signals_monthly_eur'], limit: 1 })).data[0]
    const sub = await api.subscriptions.create({ customer: c.id, items: [{ price: price.id }], metadata: { userId: uid } })
    await pool.query('UPDATE subscription SET status=$2, provider=$3, "providerCustomerId"=$4, "providerSubscriptionId"=$5, "currentPeriodEnd"=NOW()+INTERVAL \'30 days\' WHERE "userId"=$1', [uid, 'active', 'stripe', c.id, sub.id])
    const page = await b.newPage({ viewport: { width: 1280, height: 900 } })
    await page.context().addCookies((await http.storageState()).cookies)
    await page.goto(`${ORIGIN}/profilis#prenumerata`)
    await page.getByRole('button', { name: 'Atšaukti prenumeratą' }).click()
    await page.getByRole('button', { name: 'Per brangu' }).click()
    await page.getByRole('button', { name: 'Atšaukti prenumeratą' }).last().click()
    await page.getByRole('button', { name: 'Tęsti prenumeratą' }).waitFor({ timeout: 20000 })
    let s = await api.subscriptions.retrieve(sub.id)
    console.log('after cancel', s.cancel_at_period_end, s.cancellation_details?.feedback, s.status)
    await page.getByRole('button', { name: 'Tęsti prenumeratą' }).click()
    await page.getByRole('button', { name: 'Atšaukti prenumeratą' }).waitFor({ timeout: 20000 })
    s = await api.subscriptions.retrieve(sub.id)
    console.log('after resume', s.cancel_at_period_end, s.status)
  } finally {
    console.log('deleted', (await http.post('/api/account/delete', { data: { confirm: email } })).status())
    if (customerId) await api.customers.del(customerId).catch(() => {})
    await b.close(); await http.dispose(); await pool.end()
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
