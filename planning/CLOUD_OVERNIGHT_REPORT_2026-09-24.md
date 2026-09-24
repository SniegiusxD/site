# Cloud overnight report — site, 2026-09-24

Branch `cloud/overnight-1` (from `claude/round27`), draft PR
[SniegiusxD/site#4](https://github.com/SniegiusxD/site/pull/4) into `claude/round27`.
Tasks from `planning/CLOUD_OVERNIGHT_TASKS.md`, one idea per commit.

## How it was checked

Before every push: `pnpm install --frozen-lockfile`, `npx tsc --noEmit`,
`pnpm lint` (now `--max-warnings=0`), `pnpm test`, the production build with
`BETTER_AUTH_SECRET=ci-dummy-secret-at-least-32-characters-long`, and
`CI=1 pnpm test:e2e`. The logged-in `member-flow.spec.ts` also ran locally:
Postgres 16 was already installed in the container, so I created the same
`statyk_test` database CI uses and seeded it with `scripts/seed-member-ci.ts`.
The container's Playwright browser build was older than the one
`@playwright/test` 1.63 expects. I linked the installed headless shell under
the expected path; this changed the container only, not the repo.

Every push was also green in the GitHub `Checks` workflow.

Final state: 355 unit tests; 47 e2e checks passing (plus the one intentional
skip). The Checks table in the PR shows each run.

Browser checks that are not committed (they live in `tests/e2e/zz-local-*`,
which is excluded in `.git/info/exclude`):
- pinning, hiding, sort and saved views survive a reload
- the deep link opens on phone and desktop
- the profile, month dialog and tracker load without page errors
- the tracker shows 429 with its wait, a retry works, a network failure is
  reported, and a 401 shows "Prisijungti"

## Done

### Task 0 — lint to zero
- `lib/use-stored-state.ts`: `useStoredState(key, parse, fallback)` on
  `useSyncExternalStore`. The server snapshot is `null` and the client snapshot
  is the raw string. The setter notifies same-tab subscribers and falls back to
  memory when storage refuses. `useStoredOnce(key)` reads a value once per
  view, for "last seen" markers.
- Board preferences moved over one commit each: pinned, hidden (pruning is now
  computed), sort/filters, saved views, and last visit
  (`lib/use-last-visit.ts`). Last visit is frozen for the page view and written
  after 5 s, on pagehide and on unmount.
- The other warnings were fixed without disabling any rule:
  - price flashes are computed when a poll lands (`pollPulses`)
  - the deep link comes from the server's search params (`linkedRow`)
  - the desktop first selection is adjusted during render
  - bets-view, billing-card and the landing components were rewritten to avoid
    setting state in effects
  - `BookMark` uses `next/image` (images are unoptimized, and the box sets the
    size)
- `pnpm lint` = `eslint --max-warnings=0 .`, and the `set-state-in-effect`
  override was removed.

### Task 1 — "Kompaktiškas" board
- A header toggle (`Įprastas` / `Kompaktiškas`).
- Desktop shows one line per signal under a column header, with copy / pin /
  hide inline. Phones show two lines.
- Same data and handlers as before. Selection, the detail pane, deep links and
  the phone sheet are unchanged.
- The row was first extracted into `components/app/signal-row.tsx`.
- `member-flow.spec.ts` switches to compact, reloads, and opens a signal from
  a compact row.

### Task 2 — CLV reliability
- `lib/close-evidence.ts` is pure, with fixture tests. `lib/close-evidence-store.ts`
  reads the table: 42P01 means no evidence, and other errors are logged and
  also read as no evidence.
- Trust comes only from a literal `trusted: true`. No snapshot means "not
  trusted".
- The label appears next to the tracker's CLV stats and in the landing proof
  section. It is read by the server pages and is in the first frame.
- CI has no snapshot table, and e2e asserts both places say "CLV dar
  nepatikimas".

### Task 3 — board split
- `components/app/board/` now holds:
  - `daily-target.tsx`
  - `locked-strip.tsx`
  - `list-parts.tsx` (Collapsible, Notice)
  - `use-board-preferences.ts`
  - `filters.tsx` (SavedViewsChip, SortChip, FilterChips)
  - `use-live-board.ts` (polling, bets, pulses)
  - `bet-flight.tsx`
  - `phone-sheet.tsx`
- `signal-board.tsx` went from about 1,400 lines to 585.
- The filter chips read the shared stored view and the account themselves, so
  no props are drilled.
- One dead piece of state, a single `sport` that was only ever null, was
  removed in its own commit.

### Task 4 — `useApi`
- `lib/use-api.ts` provides `useApi(url)`, which returns `{ data, error,
  loading, reload, settledAt }`.
  - GET with `no-store`, aborted on unmount or when the URL changes.
  - A null URL means "not yet".
  - The error is an `ApiError` carrying the status, `Retry-After` and the
    server's own message.
- Moved onto it, one commit each: tracker list, a bet's corrections, trial
  recap, month dialog, first steps, limit history, price history, bankroll
  history, profile summary, Telegram card, billing status.

### Task 5 — performance in CI
- Landing, at 412×823 and 1440×900:
  - summed CLS without input stays under 0.05 while scrolling 300 px / 150 ms
    (measured 0.001)
  - the LCP entry is inside the hero `h1`
- The same scroll check runs on `/signalai` in the member flow.
- `lib/__tests__/globals-css.test.ts` checks that every `@keyframes` animates
  only transform and opacity. `row-new` (board-only, 2.6 s, one-shot) is the
  one listed exception.
- **Found and fixed:** on phones the "thousand bets" summary sentence wrapped
  and pushed the chart 23 px (CLS 0.019). Its height is now reserved.

### Task 6 — member-page accessibility
- axe (WCAG 2.1 A/AA) runs in `member-flow.spec.ts` on `/signalai`, a signal's
  detail, `/statymai`, `/profilis`, `/pagalba` and `/atrakinti` at 412 and
  1440 px. It also runs with the month dialog open and in compact mode.
  **axe reported no violations.**
- **Fixed (not visible to axe):** the three modal dialogs (month, bankroll,
  phone signal sheet) let focus leave and did not return it, and the phone
  sheet ignored Escape.
  - `lib/use-focus-trap.ts` moves focus in, wraps Tab, closes on Escape and
    restores focus.
  - Keyboard e2e checks cover the month dialog and the phone sheet.

### Task 7 — lib tests
New tests:
- `format-lt` (plurals at every boundary, rounding, NBSP grouping, Kelly edge
  cases)
- Vilnius time (midnight in summer and winter, 25 October and 29 March 2026,
  month ends, leap Februaries); these pass with TZ set to Auckland and to Los
  Angeles
- stake sizing (5 % cap, floor, per-book limit, remainder after a bet)
- `pace`, `signal-taxonomy`, `sports-lt`, `evidence`

**No real bugs surfaced.**

### Task 8 — explicit states
- `lib/api-error.ts` has `errorAdvice`, `waitLabel` and `pollErrorMessage`,
  all tested:
  - offline → check the connection and retry
  - 401 → sign in (no retry)
  - 429 → the wait from `Retry-After`
  - 5xx → retry, without the server's internals
  - 402/403 → no retry
- `components/app/load-error.tsx` renders the message with a retry button or
  a sign-in link.
- **Fixed dead ends:**
  - the tracker spun forever after a failed first load
  - the month dialog drew an empty month on failure
  - price history said "no history yet" on failure
  - bankroll history said "no entries" on failure
  - the profile summary skeleton pulsed forever
  - the billing card said "Įkeliama…" forever
  - the Telegram card had no retry
- The board poll now says why it failed and when it tries again.
- Spinners and loading text are announced (`role="status"`).

## Decisions made alone

- **Compact mode is also stored in a cookie** (`kr-board-density`), next to
  `useStoredState`. The server then renders the chosen density; otherwise
  compact members would see the list switch after load (a layout shift). The
  cookie is only a render hint; localStorage stays the per-browser memory.
- **Compact rows on phones have no inline pin/hide/copy.** Two lines leave no
  room for touch targets. The normal view and the detail keep those actions.
- **The compact list column widens** (44/52/60 rem at lg/xl/2xl) so one line
  fits.
- **Desktop first selection:** the detail pane still opens on the top signal
  and then keeps it, as before. It is now set during render instead of in an
  effect.
- **Optional extras stay silent on failure:** the trial recap, first steps,
  limit history and a bet's correction history show nothing when their
  request fails. Each is a supplement, and the screen around it works without
  it. Everything a member came to the page for now says what went wrong.
- **The board poll keeps its own hook** (`use-live-board.ts`) instead of
  `useApi`. It polls on visibility, diffs prices into flashes, and refreshes
  the server page on 401/402. It does use `fetchJson` and the shared wording.
- **The phone-landing CLS fix** reserves the longer sentence's height with an
  invisible copy in the same grid cell. The live region announces only the
  visible sentence.
- **The CLS threshold is 0.05** as the task file says, while the measured
  value is 0.001. Only the member flow sets its own test timeout (120 s,
  because it now visits 12 page/width combinations with axe).

## Not done / left alone

- "If you finish early": `BookMark` was already moved to `next/image` in
  Task 0, because that was the last lint warning.
- `lib/format.ts` is imported nowhere (legacy `eur`, `formatTimeUntil`).
  Nothing was deleted, because it was out of scope.
- `components/app/owner-member-actions.tsx` puts `aria-modal` on an inline
  confirmation box. It is owner-only and next to `lib/admin*`, so it was left
  alone.
- The e2e member flow runs only in the `desktop` project, as before. The
  phone-width checks inside it resize the desktop browser; they do not emulate
  a touch device.

## For a human to check

1. Look at the compact board on a real phone and a large desktop. Is the
   column set right for how members scan (sport · match · bet · odds · fair ·
   value · stake · start)?
2. The CLV label wording: "CLV dar nepatikimas", one sentence per reason, and
   "Uždarymo kaina: N % signalų". The reasons are in `REASON_TEXT` in
   `lib/close-evidence.ts`.
3. When the scanner creates `site_evidence_snapshot`, confirm the column types
   match. The parser accepts a Date or string `generated_at`, a numeric or
   string `close_coverage`, and `close_trust` as jsonb or text.
4. The Lithuanian error sentences in `lib/api-error.ts`.
