/**
 * Release smoke: one new member walks the whole product, then is deleted.
 *
 * Run it after every site deploy, against the deployment itself:
 *
 *   E2E_ORIGIN=https://predictions-dashboard-two.vercel.app \
 *     node --env-file=.env.local --experimental-strip-types tests/e2e/release-smoke.manual.ts
 *
 * Without E2E_ORIGIN it runs against a local dev server on :3100. It needs
 * DATABASE_URL (to find and remove its own account if a step fails) and never
 * pays: payment is covered by billing-checkout.manual.ts against test mode.
 * Every step prints ✓ or ✗; the exit code is the number of failed steps.
 */
import { chromium, request as playwrightRequest } from '@playwright/test'
import { Pool } from 'pg'

const ORIGIN = process.env.E2E_ORIGIN ?? 'http://localhost:3100'
const email = `e2e-check-${Date.now()}-smoke@example.com`
const password = 'Slaptazodis123!'
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

let failures = 0
async function check(label: string, run: () => Promise<unknown>) {
  try {
    const detail = await run()
    console.log(`✓ ${label}${detail === undefined ? '' : ': ' + (typeof detail === 'string' ? detail : JSON.stringify(detail))}`)
  } catch (error) {
    failures += 1
    console.log(`✗ ${label}: ${error instanceof Error ? error.message : String(error)}`)
  }
}
const expect = (ok: boolean, message: string) => {
  if (!ok) throw new Error(message)
}

async function main() {
  console.log(`release smoke against ${ORIGIN}`)
  const http = await playwrightRequest.newContext({ baseURL: ORIGIN, extraHTTPHeaders: { Origin: ORIGIN, Referer: `${ORIGIN}/` } })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  let betId = ''
  let signal: { id: string; prices: Array<{ book: string; odds: number; selectionLabel: string }>; sport: string; home: string; away: string; market: string; line: number | null; fairProb: number; startsAt: string; eventKey?: string } | null = null

  try {
    await check('public pages answer', async () => {
      const codes: Record<string, number> = {}
      for (const path of ['/', '/demo', '/metodika', '/skaiciuokle']) codes[path] = (await http.get(path)).status()
      expect(Object.values(codes).every((code) => code === 200), JSON.stringify(codes))
      return codes
    })

    await check('sign up', async () => {
      const response = await http.post('/api/auth/sign-up/email', { data: { email, password, name: 'Smoke' } })
      expect(response.ok(), `status ${response.status()}`)
      return email
    })

    // The browser shares the API session so page checks run as the member.
    await page.context().addCookies((await http.storageState()).cookies)

    await check('the board waits for onboarding', async () => {
      await page.goto(`${ORIGIN}/signalai`)
      expect(page.url().includes('/pradzia'), `landed on ${page.url()}`)
      return new URL(page.url()).pathname
    })

    await check('onboarding', async () => {
      const response = await http.post('/api/onboarding', {
        data: {
          bankroll: 500, books: ['7BET', 'TopSport', 'Betsson'], minEdge: 0.02, minOdds: 1.3, maxOdds: 6,
          maxHoursToStart: 48, kellyFraction: 0.25, dailyBets: 10, bookLimits: {},
        },
      })
      expect(response.ok(), `status ${response.status()}`)
    })

    await check('free board', async () => {
      const live = await (await http.get('/api/live')).json()
      expect(live.tier === 'free', `tier ${live.tier}`)
      return { tier: live.tier, signals: live.signals?.length ?? 0 }
    })

    await check('trial starts once', async () => {
      const first = await (await http.post('/api/trial')).json()
      const second = await (await http.post('/api/trial')).json()
      expect(first.started === true && second.started === false, JSON.stringify({ first: first.started, second: second.started }))
      const live = await (await http.get('/api/live')).json()
      expect(live.tier === 'full', `tier after trial ${live.tier}`)
      signal = live.signals?.find((s: { status?: string }) => s.status !== 'closed') ?? live.signals?.[0] ?? null
      return { tier: live.tier, signals: live.signals?.length ?? 0 }
    })

    await check('a signal opens from a link', async () => {
      if (!signal) return 'no live signal right now — skipped'
      await page.goto(`${ORIGIN}/signalai?signal=${encodeURIComponent(signal.id)}&book=${encodeURIComponent(signal.prices[0].book)}`)
      await page.getByText('Kodėl šis statymas').first().waitFor({ timeout: 20_000 })
      return `${signal.home} – ${signal.away}`
    })

    await check('record a bet', async () => {
      const price = signal?.prices[0]
      const response = await http.post('/api/bets', {
        data: price && signal
          ? {
              signalId: signal.id, sport: signal.sport.toUpperCase(), match: `${signal.home} vs ${signal.away}`,
              betDescription: price.selectionLabel, bookmaker: price.book, odds: price.odds, stake: 5,
              marketType: signal.market, line: signal.line, startsAt: signal.startsAt, entryFairProb: signal.fairProb,
              eventKey: signal.eventKey, shownOdds: price.odds, shownStake: 5,
            }
          : {
              signalId: 'ls2_smoke', sport: 'BASKETBALL', match: 'Alfa vs Beta', betDescription: 'Moneyline: Alfa',
              bookmaker: '7BET', odds: 2.1, stake: 5, marketType: 'moneyline', pickName: 'Alfa',
              startsAt: new Date(Date.now() - 3600e3).toISOString(), entryFairProb: 0.5,
            },
      })
      const body = await response.json()
      expect(response.ok(), `status ${response.status()} ${JSON.stringify(body)}`)
      betId = body.bet?.id ?? body.id
      return betId
    })

    await check('edit, then correct the result by hand', async () => {
      await http.patch(`/api/bets/${betId}`, { data: { note: 'smoke', tags: ['smoke'] } })
      const settled = await (await http.patch(`/api/bets/${betId}`, { data: { status: 'laimeta' } })).json()
      const edits = (await (await http.get(`/api/bets/${betId}`)).json()).edits ?? []
      const bet = ((await (await http.get('/api/bets')).json()).bets ?? []).find((b: { id: string }) => b.id === betId)
      expect(bet?.status === 'laimeta' && bet?.resultSource === 'member', JSON.stringify({ status: bet?.status, source: bet?.resultSource }))
      expect(edits.length >= 3, `edits ${edits.length}`)
      return { applied: settled.changes, edits: edits.length, profit: bet.profit }
    })

    await check('the tracker renders', async () => {
      await page.goto(`${ORIGIN}/statymai`)
      await page.locator('h1').first().waitFor({ timeout: 20_000 })
      expect((await page.locator('body').innerText()).includes('Statymai'), 'no heading')
    })

    await check('Telegram link can be created', async () => {
      const response = await http.post('/api/telegram/link')
      const body = await response.json().catch(() => ({}))
      if (response.status() === 503 || body?.error) return `bot not configured here (${response.status()})`
      expect(String(body.url ?? '').startsWith('https://t.me/'), JSON.stringify(body))
      return 't.me link issued'
    })

    await check('billing answers', async () => {
      const status = await (await http.get('/api/billing/status')).json()
      if (!status.enabled) return 'billing off on this deployment'
      const checkout = await http.post('/api/billing/checkout')
      const body = await checkout.json()
      expect(String(body.url ?? '').includes('checkout.stripe.com'), JSON.stringify(body))
      return { testMode: status.testMode, checkout: 'session created, not paid' }
    })

    await check('export', async () => {
      const response = await http.get('/api/account/export')
      const data = await response.json()
      expect(response.ok() && data.data?.user_bet?.length === 1, `status ${response.status()}`)
      return `${Object.keys(data.data).length} tables`
    })
  } finally {
    await check('delete and sign-out', async () => {
      const response = await http.post('/api/account/delete', { data: { confirm: email } })
      expect(response.ok(), `status ${response.status()}`)
      const after = await http.get('/api/account/export')
      expect(after.status() === 401, `old session answered ${after.status()}`)
    })
    // Belt and braces: whatever a failed step left behind goes too.
    const { rows } = await pool.query(`SELECT id FROM "user" WHERE email = $1`, [email])
    for (const { id } of rows) {
      for (const table of ['bet_edit', 'billing_event', 'execution_event', 'book_limit_event', 'bankroll_entry', 'subscription', 'telegram_sent', 'telegram_preset', 'telegram_link_token', 'telegram_account', 'user_settings', 'user_bet', 'session', 'account']) {
        await pool.query(`DELETE FROM "${table}" WHERE "userId" = $1`, [id]).catch(() => {})
      }
      await pool.query(`DELETE FROM "user" WHERE id = $1`, [id])
    }
    await browser.close()
    await http.dispose()
    await pool.end()
  }
  console.log(failures ? `${failures} step(s) failed` : 'all steps passed')
  process.exit(failures)
}

void main()
