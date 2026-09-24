import { expect, test } from '@playwright/test'

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one isolated member journey')
})

test('member can onboard, inspect a signal, record it, and open tracker and help', async ({ page }) => {
  const email = `e2e-check-${Date.now()}-member@example.com`
  const password = 'Slaptazodis123!'
  try {
    const signup = await page.request.post('/api/auth/sign-up/email', {
      data: { email, password, name: 'CI member' },
    })
    expect(signup.ok()).toBeTruthy()

    await page.goto('/signalai')
    await expect(page).toHaveURL(/\/pradzia/)

    const onboarding = await page.request.post('/api/onboarding', {
      data: {
        bankroll: 500, books: ['7BET', 'TopSport', 'Betsson'], minEdge: 0.02,
        minOdds: 1.3, maxOdds: 6, maxHoursToStart: 48, kellyFraction: 0.25,
        dailyBets: 10, bookLimits: {},
      },
    })
    expect(onboarding.ok()).toBeTruthy()
    expect((await page.request.post('/api/trial')).ok()).toBeTruthy()

    const liveResponse = await page.request.get('/api/live')
    const live = await liveResponse.json()
    expect(liveResponse.ok()).toBeTruthy()
    expect(live.tier).toBe('full')
    expect(live.signals).toHaveLength(1)
    expect(live.signals[0].prices[0]).toMatchObject({ book: 'TopSport', odds: 1.98 })

    await page.goto('/signalai?signal=ci-signal-1&book=TopSport')
    await expect(page.getByText('Kodėl šis statymas').first()).toBeVisible()

    const signal = live.signals[0]
    const price = signal.prices[0]
    const recorded = await page.request.post('/api/bets', {
      data: {
        signalId: signal.id, sport: signal.sport.toUpperCase(),
        match: `${signal.home} vs ${signal.away}`, betDescription: price.selectionLabel,
        bookmaker: price.book, odds: price.odds, stake: 5, marketType: signal.market,
        line: signal.line, startsAt: signal.startsAt, entryFairProb: signal.fairProb,
        eventKey: signal.eventKey, shownOdds: price.odds, shownStake: 5,
      },
    })
    expect(recorded.ok()).toBeTruthy()

    await page.goto('/statymai')
    await expect(page.getByRole('heading', { name: 'Statymai' })).toBeVisible()
    await expect(page.getByText('Vilniaus Testas – Kauno Testas')).toBeVisible()

    await page.goto('/pagalba')
    await expect(page.getByRole('heading', { name: /Pagalba/ })).toBeVisible()
  } finally {
    await page.request.post('/api/account/delete', { data: { confirm: email } }).catch(() => null)
  }
})
