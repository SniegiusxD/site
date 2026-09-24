/**
 * Export and deletion, end to end, against a running dev server, the real
 * database and Stripe TEST mode. Not part of CI: it creates a real account.
 *
 *   node --env-file=.env.local --experimental-strip-types tests/e2e/account-data.manual.ts
 */
import { request as playwrightRequest } from '@playwright/test'
import { Pool } from 'pg'
import Stripe from 'stripe'

const ORIGIN = process.env.E2E_ORIGIN ?? 'http://localhost:3100'
const email = `e2e-check-${Date.now()}-delete@example.com`
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
const api = new Stripe(process.env.STRIPE_SECRET_KEY!)
const step = (label: string, value: unknown) => console.log(`✓ ${label}:`, typeof value === 'string' ? value : JSON.stringify(value))
const TABLES = ['user_settings', 'subscription', 'bankroll_entry', 'user_bet', 'bet_edit', 'book_limit_event', 'telegram_account', 'telegram_preset', 'telegram_sent', 'telegram_link_token', 'billing_event', 'execution_event', 'book_request', 'feedback', 'session', 'account']

async function main() {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw new Error('needs a Stripe TEST key')
  const http = await playwrightRequest.newContext({ baseURL: ORIGIN, extraHTTPHeaders: { Origin: ORIGIN, Referer: `${ORIGIN}/` } })
  let userId = ''
  let customerId = ''
  try {
    if (!(await http.post('/api/auth/sign-up/email', { data: { email, password: 'Slaptazodis123!', name: 'E2E' } })).ok()) throw new Error('sign-up')
    const prefs = { books: ['7BET', 'TopSport', 'Betsson'], minEdge: 0.02, minOdds: 1.3, maxOdds: 6, maxHoursToStart: 48, kellyFraction: 0.25, dailyBets: 10 }
    await http.post('/api/onboarding', { data: { ...prefs, bankroll: 500, bookLimits: {} } })
    userId = (await pool.query(`SELECT id FROM "user" WHERE email = $1`, [email])).rows[0].id

    // Data in the tables that do not cascade, plus the usual ones.
    const bet = await (await http.post('/api/bets', {
      data: {
        signalId: 'ls2_e2e_delete', sport: 'BASKETBALL', match: 'Alfa vs Beta', betDescription: 'Moneyline: Alfa',
        bookmaker: '7BET', odds: 2.1, stake: 10, marketType: 'moneyline', pickName: 'Alfa',
        startsAt: new Date(Date.now() + 3600e3).toISOString(), entryFairProb: 0.5,
      },
    })).json()
    const betId = bet.bet?.id ?? bet.id
    await http.patch(`/api/bets/${betId}`, { data: { odds: 2.2, stake: 10, note: 'test' } })
    await http.put('/api/preferences', { data: { ...prefs, bookLimits: { TopSport: 40 } } })

    // A live test subscription, charging, as a paying member would have.
    const customer = await api.customers.create({ email, metadata: { userId } })
    customerId = customer.id
    const pm = await api.paymentMethods.attach('pm_card_visa', { customer: customer.id })
    await api.customers.update(customer.id, { invoice_settings: { default_payment_method: pm.id } })
    const price = (await api.prices.list({ lookup_keys: ['statyk_all_signals_monthly_eur'], limit: 1 })).data[0]
    const sub = await api.subscriptions.create({ customer: customer.id, items: [{ price: price.id }], metadata: { userId } })
    await pool.query(
      `UPDATE subscription SET status = 'active', provider = 'stripe', "providerCustomerId" = $2, "providerSubscriptionId" = $3 WHERE "userId" = $1`,
      [userId, customer.id, sub.id],
    )
    step('member set up', { betId, subscription: sub.status })

    // Export.
    const exported = await http.get('/api/account/export')
    const disposition = exported.headers()['content-disposition'] ?? ''
    const data = await exported.json()
    const counts = Object.fromEntries(Object.entries(data.data).map(([table, rows]) => [table, (rows as unknown[]).length]))
    const text = JSON.stringify(data)
    const leaked = ['"password"', '"token"', '"accessToken"', '"refreshToken"'].filter((key) => text.includes(key))
    if (!disposition.includes('attachment')) throw new Error('export is not a download')
    if (leaked.length) throw new Error(`export leaks ${leaked.join(', ')}`)
    if (counts.user_bet !== 1 || counts.bet_edit < 1 || counts.book_limit_event < 1) throw new Error(`export incomplete ${JSON.stringify(counts)}`)
    step('export', { file: disposition.split('filename=')[1], counts, secrets: 'none' })

    // Wrong confirmation is refused.
    const wrong = await http.post('/api/account/delete', { data: { confirm: 'someone@else.com' } })
    if (wrong.status() !== 400) throw new Error(`wrong confirmation answered ${wrong.status()}`)
    step('wrong email refused', wrong.status())

    // Deletion.
    const deleted = await http.post('/api/account/delete', { data: { confirm: email.toUpperCase() } })
    if (!deleted.ok()) throw new Error(`delete ${deleted.status()} ${await deleted.text()}`)
    const after = await api.subscriptions.retrieve(sub.id)
    if (after.status !== 'canceled') throw new Error(`stripe still ${after.status}`)
    step('stripe subscription', after.status)

    const left: Record<string, number> = {}
    for (const table of TABLES) {
      const { rows } = await pool.query(`SELECT count(*)::int AS n FROM "${table}" WHERE "userId" = $1`, [userId])
      if (rows[0].n) left[table] = rows[0].n
    }
    const userLeft = (await pool.query(`SELECT count(*)::int AS n FROM "user" WHERE id = $1`, [userId])).rows[0].n
    if (Object.keys(left).length || userLeft) throw new Error(`rows left: ${JSON.stringify({ ...left, user: userLeft })}`)
    step('database after delete', 'no rows left in any member table')

    const stale = await http.get('/api/account/export')
    step('old session after delete', stale.status())
  } finally {
    if (customerId) await api.customers.del(customerId).catch(() => {})
    if (userId) {
      for (const table of TABLES) await pool.query(`DELETE FROM "${table}" WHERE "userId" = $1`, [userId]).catch(() => {})
      await pool.query(`DELETE FROM "user" WHERE id = $1`, [userId]).catch(() => {})
    }
    await http.dispose()
    await pool.end()
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error('✗', error instanceof Error ? error.message : error)
    process.exit(1)
  },
)
