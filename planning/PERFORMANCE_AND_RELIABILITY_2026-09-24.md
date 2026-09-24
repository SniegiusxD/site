# Performance and reliability pass — 2026-09-24

Written for: whoever works on the site next. Numbers are measured, not
estimated; the method is at the bottom so they can be repeated.

## Found on the live site (first deploy since 09-19)

Lighthouse, mobile, production landing: performance 73, accessibility 100,
best practices 100, SEO 100. Two failing vitals and a hidden member-facing bug.

| Problem | Cause | Fix | Before → after |
|---|---|---|---|
| Landing layout shift | Hero board opened rows of different heights every 5.2 s, resizing the hero and its %-sized stripe layer | Open rows padded to three books; stripe layer fixed size | CLS 0.451 → 0.001 |
| Headline re-wrapped on phones | The rotating bookmaker word changed the first line's width | The word ends its own line | (part of the above) |
| Scroll-time shift on phones | Journey's Telegram step removed and re-added its three alerts every 11 s | Slots stay laid out, only hidden | 0.245 → 0.004 |
| LCP was a small lazy logo at 3.6 s | Headline started fully clipped, so the last animation to finish became LCP | Headline rises from a faint, low start and paints in frame one | LCP 3.6 s → 0.42 s (measured, 4× CPU) |
| 9 non-composited animations | background-position stripes, box-shadow glow, `top` scan line, `stroke-dashoffset` on a span | transform/opacity only; the "live" dot ping now actually pulses | 9 → 1 (the rotating word's width, occasional) |
| Main-thread work | the above repainting every frame | — | 5.2 s → 1.5 s; TBT 270 → 10 ms |
| Board pushed down after load | First-steps card read its dismissal from localStorage after hydration | Dismissal is also a cookie the server reads | Board CLS 0.064 → 0.000 |
| **Tracker spinner for ~40 s** | `GET /api/bets` graded pending bets inline, asking ESPN/Flashscore per match | Grading runs with `after()`; tracker re-checks once after 30 s | 43.6 s → 0.53 s |
| No view of visitors' crashes | — | `/api/client-error` + `[client-error]` log lines; `instrumentation.ts` `[server-error]`; `global-error.tsx` | verified with thrown test errors |
| 21 high / 23 moderate prod advisories | `shadcn` CLI in `dependencies` | moved to devDependencies; overrides for browserslist, baseline-browser-mapping, vitest | `pnpm audit --prod`: 0; CI now fails on high |

Also: the hero board column is narrower from 1024 to 1280 px so the headline is
not squeezed into five lines on small laptops.

Scroll-through CLS after the pass: `/`, `/demo`, `/metodika`, `/skaiciuokle`,
`/registracija`, `/signalai`, `/statymai`, `/profilis`, `/atrakinti`, `/pagalba`
all 0.000–0.004 at 412 and 1440 px; no page scrolls sideways.

Infrastructure checks that were already right: Vercel functions run in `iad1`,
next to Neon `us-east-1`; warm authenticated pages answer in 0.2–0.3 s (cold
~1.4 s); static pages are served from the Stockholm edge; security headers are
live; the rate limiter is connected to Upstash (a real 429 with Retry-After was
observed after the coder's canary).

## Not changed, on purpose

- The display font (Bricolage Grotesque with the `opsz` axis, 76 KB) drives
  Lighthouse's simulated slow-4G LCP estimate. Dropping the axis changes how
  every headline looks; real LCP is already ~0.4 s.
- The rotating word animates `width` (non-composited) once every 2.2 s. Cheap.

## How to measure again

- Landing and public pages: a Playwright script with `PerformanceObserver`
  (`layout-shift`, `largest-contentful-paint`) at 412×823 with
  `Emulation.setCPUThrottlingRate 4`, scrolling 300 px every 180 ms, against a
  production build (`pnpm build && next start`, `VERCEL_ENV=development`).
- Lighthouse: `npx lighthouse@12 <url> --only-categories=performance,...`.
- Member pages: the same with a throwaway `e2e-check-*` account.
- Errors: `npx vercel logs <deployment> --since 1h | grep -E "client-error|server-error"`.

## Later the same day

- Phone landing: the footer's glyph counter was unreadable on phones (≈5 cells
  per character) — finer cells, taller field, euro sign on its own line; the
  closing-price line in "Kaina juda" crossed every name and caption — now drawn
  only through the bar rows.
- Rate limits and shared mobile IPs (CGNAT): auth is now 60/15 min per IP plus
  8/15 min per account (HMAC of the email) on sign-in/sign-up/password reset;
  sign-out is never limited. Signed-in expensive actions (trial, checkout,
  cancel, export…) count per session cookie hash instead of per IP, so members
  on one mobile address no longer share a 5-per-10-minutes window.
