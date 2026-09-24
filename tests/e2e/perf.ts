import type { Page } from '@playwright/test'

/**
 * Layout-stability helpers shared by the public and member specs. The numbers
 * behind them are in planning/PERFORMANCE_AND_RELIABILITY_2026-09-24.md: the
 * landing went from CLS 0.451 to 0.001 and the board from 0.064 to 0; these
 * keep it there with a generous 0.05 ceiling.
 */

declare global {
  interface Window {
    __cls: number
    __lcp: Array<{ tag: string; inH1: boolean; text: string }>
  }
}

/** Starts summing layout shifts (without recent input) and recording LCP candidates before the page loads. */
export async function observeVitals(page: Page) {
  await page.addInitScript(() => {
    window.__cls = 0
    window.__lcp = []
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { value: number; hadRecentInput: boolean }>) {
        if (!entry.hadRecentInput) window.__cls += entry.value
      }
    }).observe({ type: 'layout-shift', buffered: true })
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { element: Element | null }>) {
        const element = entry.element
        window.__lcp.push({
          tag: element?.tagName ?? '',
          inH1: Boolean(element?.closest('h1')),
          text: (element?.textContent ?? '').trim().slice(0, 60),
        })
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true })
  })
}

/** Scrolls the page (or a scrolling list inside it) 300 px every 150 ms to the bottom. */
export async function scrollToBottom(page: Page, selector?: string) {
  await page.evaluate(async (target) => {
    const box = target ? document.querySelector<HTMLElement>(target) : null
    const scroller = box && box.scrollHeight > box.clientHeight ? box : document.scrollingElement!
    const view = scroller === document.scrollingElement ? window.innerHeight : scroller.clientHeight
    for (let top = 0; top < scroller.scrollHeight - view; top += 300) {
      scroller.scrollTo(0, top)
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
    scroller.scrollTo(0, scroller.scrollHeight)
    await new Promise((resolve) => setTimeout(resolve, 300))
  }, selector ?? null)
}

export const layoutShift = (page: Page) => page.evaluate(() => window.__cls)
export const lcpEntries = (page: Page) => page.evaluate(() => window.__lcp)

/** The two widths the performance work was measured at. */
export const PERF_VIEWPORTS = { phone: { width: 412, height: 823 }, desktop: { width: 1440, height: 900 } } as const
