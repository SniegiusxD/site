# Overnight tasks for a cloud Claude session

Written for: a Claude Code cloud session with access to the GitHub repository
`SniegiusxD/site` and nothing else. Work alone for hours; nobody will answer
questions. When something is ambiguous, pick the conservative option, write
the decision down, and keep going.

## What you have and what you do not

- You have: this repository, Node/pnpm, the unit tests, a production build,
  Playwright for the public pages.
- You do **not** have: `.env.local`, the database, Stripe, Upstash, the VM, or
  Vercel. Never try to obtain secrets, never call production URLs, never add
  real keys anywhere.
- Logged-in browser tests (`tests/e2e/member-flow.spec.ts`) need the Postgres
  service that GitHub CI starts. If you cannot run Postgres locally, rely on
  unit tests plus the CI run on your pull request.

## Where to start and where to push

1. Start from branch `claude/round27` (main + the latest Claude and coder work).
2. Create branch `cloud/overnight-1`. Commit small, one idea per commit, with
   messages that explain why.
3. Push that branch and open a **draft** pull request into `claude/round27`.
   Never push to `main`, `redesign` or anyone else's branch; `main` deploys to
   production.
4. Before every push: `pnpm install --frozen-lockfile`, `npx tsc --noEmit`,
   `pnpm lint`, `pnpm test`, `BETTER_AUTH_SECRET=ci-dummy-secret-at-least-32-characters-long pnpm build`,
   and `CI=1 pnpm test:e2e` for the public pages. All must pass.
5. End with `planning/CLOUD_OVERNIGHT_REPORT_<date>.md`: what is done, what is
   not, decisions you made, anything a human must check.

## House rules (read `CLAUDE.md`/`AGENTS.md` and the code around you first)

- Lithuanian UI copy, plain words, no hype, never promise profit. Match the
  voice of existing screens.
- Match the surrounding code: comment density, naming, Tailwind tokens
  (`bg-stand`, `text-haze`, `floodlight`…), framer-motion with the repo's
  `EASE = [0.22, 1, 0.36, 1]`.
- Motion: transform and opacity only; respect calm mode (`useReducedMotion`
  from `@/lib/use-reduced-motion`); nothing that appears after load may push
  content (layout shift). Read `planning/PERFORMANCE_AND_RELIABILITY_2026-09-24.md`.
- Phones first: check 390 px and 1440 px; no sideways scroll.
- Do not touch: billing (`lib/billing/*`, `app/api/billing/*`), auth, rate
  limits (`lib/rate-limit.ts`), `lib/admin*`, database schema files beyond
  additive changes you truly need, `.github/workflows/*`.

---

## Task 0 — lint to zero, then keep it there (board t22)

`pnpm lint` reports 17 warnings, all in `components/app/signal-board.tsx`,
`bets-view.tsx`, `billing-card.tsx` and `components/landing/*`. Most are
`react-hooks/set-state-in-effect`: preferences read from `localStorage` in an
effect after mount (pinned, hidden, saved views, sort/filters, last visit).

- Write `lib/use-stored-state.ts`: `useStoredState(key, parse, fallback)` on
  `useSyncExternalStore` — server snapshot `null`, client snapshot the raw
  string (a primitive, so it is stable), a setter that writes `localStorage` in
  try/catch and notifies same-tab subscribers. Unit-test the parse/serialise
  helpers.
- Move the board's stored preferences onto it, one commit per preference, and
  check each in the browser: pin, hide, restore view, sort. Derived values (for
  example pruning hidden ids of signals that no longer exist) should be
  computed, not written back from an effect.
- "Last visit" needs the *previous* visit's time for the whole page view:
  read it once, write the new time under the same key only when leaving or on
  a timer, and keep behaviour identical.
- The remaining few warnings: fix them the same way, or rewrite the effect so
  state is not set synchronously. Do not silence rules with comments.
- When `pnpm lint` shows 0 warnings, change the `lint` script in
  `package.json` to `eslint --max-warnings=0` (that is how CI fails on new
  warnings; do not edit the workflow file).

Task 1 below uses the same hook for its toggle, so do Task 0 first.

## Task 1 — "Profesionalus" dense board mode (board t99)

Members who bet a lot want more signals on screen. Add an optional compact
view to `/signalai`:

- A toggle in the board header ("Kompaktiškas" / "Įprastas"), remembered per
  browser with `useStoredState` from Task 0.
- Compact rows: one line per signal on desktop — sport, event, market/selection,
  book, odds, fair odds, value, suggested stake, time to start — with the same
  data the normal row already has. On phones keep two lines at most.
- Row actions inline on desktop: copy event name, pin, hide (the functions
  exist in `components/app/signal-board.tsx`).
- The selected-signal detail and deep links keep working unchanged.
- Unit tests for any new formatting/helpers; extend
  `tests/e2e/member-flow.spec.ts` with one step that switches to compact view
  and opens a signal (CI will run it).

`signal-board.tsx` is ~1,400 lines. If your change needs more than small edits
inside it, first extract the row into `components/app/signal-row.tsx` in a
separate, behaviour-preserving commit.

## Task 2 — show how reliable CLV is (consumer of `site_evidence_snapshot`)

The scanner (another repository, which you cannot see) will write a
single-row Neon table `site_evidence_snapshot` (`id = 1`). It is not deployed
yet, so everything you build must work when the table does not exist. Columns:

| column | type | meaning |
|---|---|---|
| `generated_at` | timestamptz | when the evidence was evaluated |
| `close_coverage` | float 0–1 | exact, fresh pre-start closes ÷ unique published selections |
| `close_trust` | jsonb | the trust decision, below |
| `close_by_book_sport_market` | jsonb array | `{book, sport, market, published_rows, exact_close_within_window, close_coverage}` |
| `close_coverage_detail` | jsonb | the full coverage object (not needed for the UI) |

`close_trust` looks like:

```json
{
  "trusted": false,
  "reasons": ["sample_too_small", "coverage_below_threshold"],
  "fresh_captures": 41,
  "fresh_capture_rate": 0.82,
  "largest_book_share": 0.61,
  "thresholds": { "min_unique_selections": 100, "min_coverage_rate": 0.6,
                    "min_fresh_capture_rate": 0.8, "max_prestart_minutes": 120,
                    "max_book_share": 0.7 }
}
```

The possible reasons are exactly: `sample_too_small`,
`coverage_below_threshold`, `freshness_below_threshold`,
`book_concentration_above_threshold`, `post_start_capture_detected`. (The
threshold numbers above are illustrative; read them from the row.) The rule
from the data's owner: **use `trusted` only** — never infer reliability from a
positive CLV or from some closes existing — and when it is false, show the
reasons. The site should say when CLV is trustworthy:

- `lib/close-evidence.ts`: read the snapshot (single row; the table may not
  exist yet — treat `42P01` as "no evidence", like `lib/member-outcomes.ts`
  does), parse it defensively, pure helpers with unit tests using fixture JSON.
- Tracker (`components/app/bets-view.tsx`) and the landing proof section
  (`components/landing/proof.tsx`): next to CLV figures, a short label —
  "CLV patikimas" when trusted, otherwise "CLV dar nepatikimas" with the reason
  in plain Lithuanian (map each reason code to one short sentence) and the
  coverage share.
- No layout shift: the label's space is reserved in the first render.

## If you finish early

- Task 3: `components/landing/book-mark.tsx` uses `<img>`; move to
  `next/image` only if it keeps the exact visual size and does not add layout
  shift (images are `unoptimized` in `next.config.mjs`).
- Otherwise stop and write the report. Do not invent new product features.
