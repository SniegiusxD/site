import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { layoutShift, observeVitals, PERF_VIEWPORTS, scrollToBottom } from './perf'

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one isolated member journey')
})

test('member can onboard, inspect a signal, record it, and open tracker and help', async ({ page }) => {
  // One journey through every member page, with accessibility and layout checks along the way.
  test.setTimeout(120_000)
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

    // Compact board: one line per signal, remembered, and a row still opens its detail.
    await page.goto('/signalai')
    await page.getByRole('radio', { name: 'Kompaktiškas' }).click()
    await page.reload()
    await expect(page.getByRole('radio', { name: 'Kompaktiškas' })).toHaveAttribute('aria-checked', 'true')
    const compactRow = page.getByRole('region', { name: 'Signalų sąrašas' }).getByRole('listitem').filter({ hasText: 'Vilniaus Testas' })
    await compactRow.getByRole('button').first().click()
    await expect(page).toHaveURL(/signal=ci-signal-1/)
    await expect(page.getByText('Kodėl šis statymas').first()).toBeVisible()
    await page.getByRole('radio', { name: 'Įprastas' }).click()

    // The board must not shift while it loads or is scrolled, at phone and desktop width.
    await observeVitals(page)
    for (const size of [PERF_VIEWPORTS.phone, PERF_VIEWPORTS.desktop]) {
      await page.setViewportSize(size)
      await page.goto('/signalai')
      await expect(page.getByRole('heading', { name: 'Signalai', level: 1 })).toBeVisible()
      await page.waitForTimeout(1000)
      await scrollToBottom(page, 'section[aria-label="Signalų sąrašas"] > div')
      expect(await layoutShift(page), `board layout shift at ${size.width}px`).toBeLessThan(0.05)
    }

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
    // No evidence snapshot in CI: CLV is labelled as not yet reliable.
    await expect(page.getByText('CLV dar nepatikimas')).toBeVisible()

    await page.goto('/pagalba')
    await expect(page.getByRole('heading', { name: /Pagalba/ })).toBeVisible()

    // Accessibility of the member pages, at phone and desktop width. Entrance
    // animations fade text in, so each check waits for them to finish.
    const axe = async (label: string) => {
      await page.waitForTimeout(1200)
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      expect(violations.map((violation) => `${label} ${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)).toEqual([])
    }
    for (const size of [PERF_VIEWPORTS.phone, PERF_VIEWPORTS.desktop]) {
      await page.setViewportSize(size)
      for (const path of ['/signalai', '/signalai?signal=ci-signal-1&book=TopSport', '/statymai', '/profilis', '/pagalba', '/atrakinti']) {
        await page.goto(path)
        await axe(`${path} at ${size.width}px`)
      }
    }

    // Dialogs: focus moves in, Escape closes, focus comes back to the opener.
    await page.goto('/signalai')
    const month = page.getByRole('button', { name: 'Mėnuo' })
    await month.focus()
    await page.keyboard.press('Enter')
    const monthDialog = page.getByRole('dialog')
    await expect(monthDialog).toBeVisible()
    await expect.poll(() => monthDialog.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true)
    await axe('month dialog')
    await page.keyboard.press('Escape')
    await expect(monthDialog).toHaveCount(0)
    await expect(month).toBeFocused()

    await page.getByRole('radio', { name: 'Kompaktiškas' }).click()
    await axe('compact board')
    await page.getByRole('radio', { name: 'Įprastas' }).click()

    await page.setViewportSize(PERF_VIEWPORTS.phone)
    await page.goto('/signalai?signal=ci-signal-1&book=TopSport')
    const sheet = page.getByRole('dialog', { name: 'Signalo informacija' })
    await expect(sheet).toBeVisible()
    await expect.poll(() => sheet.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    await page.setViewportSize(PERF_VIEWPORTS.desktop)

    // Last, because it locks the board: a break the member sets for themselves.
    await page.goto('/profilis#pertrauka')
    await page.getByRole('radio', { name: '24 valandos' }).click()
    await page.getByRole('button', { name: 'Įjungti pertrauką' }).click()
    await expect(page.getByText(/Pertrauka iki/).first()).toBeVisible()
    await page.goto('/signalai')
    await expect(page.getByRole('heading', { name: /Pertrauka iki/ })).toBeVisible()
    expect((await page.request.get('/api/live')).status()).toBe(423)
    await axe('paused board')
  } finally {
    await page.request.post('/api/account/delete', { data: { confirm: email } }).catch(() => null)
  }
})
