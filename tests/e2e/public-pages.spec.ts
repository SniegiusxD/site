import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { layoutShift, lcpEntries, observeVitals, PERF_VIEWPORTS, scrollToBottom } from './perf'

/**
 * Entrance animations fade text in from nothing, so a contrast check that runs
 * while they are still going measures half-transparent text. The longest is an
 * 800 ms animation behind a 520 ms delay.
 */
const settle = (page: Page) => page.waitForTimeout(1500)

/** Every page a visitor can reach without an account. */
const PAGES = [
  { path: '/', heading: /pirmas/i },
  { path: '/demo', heading: /signalas/i },
  { path: '/metodika', heading: /kaip mes matuojam/i },
  { path: '/rezultatai', heading: /^rezultatai$/i },
  { path: '/gidai', heading: /^gidai$/i },
  { path: '/gidai/kas-yra-clv', heading: /CLV/ },
  { path: '/skaiciuokle', heading: /Pamatyk, kaip atrodo/i },
  { path: '/prisijungti', heading: /sveikas sugrįžęs/i },
  { path: '/registracija', heading: /sukurk nemokamą paskyrą/i },
  { path: '/taisykles', heading: /naudojimosi taisyklės/i },
  { path: '/privatumas', heading: /privatumo politika/i },
]

for (const page of PAGES) {
  test(`${page.path} renders, has one h1 and no sideways scroll`, async ({ page: browser }) => {
    const problems: string[] = []
    browser.on('pageerror', (error) => problems.push(String(error)))
    // The URL matters more than the console line, which only says "404". The
    // Vercel analytics script only exists on Vercel, so it is missing here by
    // definition rather than by mistake.
    browser.on('response', (response) => {
      if (response.status() >= 400 && !response.url().includes('/_vercel/insights/')) {
        problems.push(`${response.status()} ${response.url()}`)
      }
    })

    const response = await browser.goto(page.path)
    await settle(browser)
    expect(response?.status(), `${page.path} should answer 200`).toBe(200)

    const headings = browser.locator('h1')
    await expect(headings).toHaveCount(1)
    await expect(headings.first()).toHaveText(page.heading)

    // A page a member has to zoom out to read is the complaint this all started
    // from, so the horizontal overflow is a test rather than a habit.
    const overflow = await browser.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, `${page.path} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(1)

    expect(problems, `${page.path} logged errors`).toEqual([])
  })

  test(`${page.path} passes axe`, async ({ page: browser }) => {
    await browser.goto(page.path)
    await settle(browser)
    const { violations } = await new AxeBuilder({ page: browser })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([])
  })
}

test('the landing page offers both a sign-up and a demo', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /nemokamą paskyrą/i }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /tikrą signalą/i }).first()).toBeVisible()
})

test('the demo opens a real signal without an account', async ({ page }) => {
  await page.goto('/demo')
  await expect(page.getByText(/kainos visose kontorose/i).first()).toBeVisible()
  await expect(page.getByText(/tikroji kaina/i).first()).toBeVisible()
})

test('the proof section says whether CLV can be trusted yet', async ({ page }) => {
  // CI has no evidence snapshot table: the label must say "not yet", never trusted.
  await page.goto('/')
  await expect(page.locator('#duomenys').getByText('CLV dar nepatikimas')).toBeAttached()
  await expect(page.locator('#duomenys').getByText('CLV patikimas', { exact: true })).toHaveCount(0)
})

test('every page points at a share card that renders', async ({ page, request }) => {
  // The cards are generated (next/og); a broken import or font fetch would only
  // show as a blank preview when someone shares a link.
  for (const path of ['/', '/rezultatai', '/gidai/kas-yra-clv']) {
    await page.goto(path)
    const image = await page.locator('meta[property="og:image"]').first().getAttribute('content')
    expect(image, `${path} has no og:image`).toBeTruthy()
    const response = await request.get(new URL(image!).pathname + new URL(image!).search)
    expect(response.status(), `${path} card`).toBe(200)
    expect(response.headers()['content-type']).toContain('image/png')
    expect((await response.body()).length).toBeGreaterThan(10_000)
  }
})

test('the results page lists a finished signal with its close and result', async ({ page }) => {
  // Seeded: a 7BET over 160.5 at 2.10, closing fair probability 0.52 (CLV +9.2 %), won.
  // It reaches the page only through the signal_record archive and the joins.
  await page.goto('/rezultatai')
  await expect(page.getByText('Duomenų dabar nepavyko įkelti')).toHaveCount(0)
  const row = page.getByRole('listitem').filter({ hasText: 'Daugiau nei 160,5' })
  await expect(row).toContainText('Klaipėdos Testas – Šiaulių Testas')
  await expect(row).toContainText('+9,2')
  await expect(row).toContainText('Laimėta')
  // The upcoming seeded signal must never appear on a public page.
  await expect(page.getByText('Vilniaus Testas')).toHaveCount(0)
})

test('the landing does not shift while it is scrolled, and its LCP is the headline', async ({ page }, testInfo) => {
  await page.setViewportSize(PERF_VIEWPORTS[testInfo.project.name === 'phone' ? 'phone' : 'desktop'])
  await observeVitals(page)
  await page.goto('/')
  await settle(page)

  // LCP is final once the page is scrolled, so it is read before.
  const lcp = await lcpEntries(page)
  expect(lcp.length, 'no LCP entry was reported').toBeGreaterThan(0)
  expect(lcp.at(-1), `LCP was ${JSON.stringify(lcp.at(-1))}`).toMatchObject({ inH1: true })

  await scrollToBottom(page)
  expect(await layoutShift(page)).toBeLessThan(0.05)
})
