# Statyk website competitive UX and architecture audit

**Date:** 2026-09-18  
**Scope:** Public homepage, authenticated signal board, signal detail, bet tracking, onboarding, profile/settings, Telegram alerts, responsive structure, animations, production architecture, and competitor comparison.

## Executive conclusion

Statyk does not need a visual redesign or more decorative animation. The current site is already more distinctive and cohesive than most of the reviewed competitors. It has a clear Lithuanian identity, a strong dark-green and cream palette, good typography, an animated product demonstration, honest CLV messaging, risk education, and reduced-motion support.

The highest-value work is functional:

1. Shorten and verify the path from a signal to a placed bet.
2. Record the odds and stake the user actually received.
3. Add price history and signal-lifecycle context.
4. Make fixture-level performance evidence prominent and auditable.
5. Complete the currently unfinished payment funnel.
6. Fix mobile and production-quality defects.
7. Add saved workflows, richer bet tracking, and browser-level testing.

The product should not chase competitor feature counts. Arbitrage, middles, live betting, parlays, AI predictions, and giant football-stat databases would dilute the current product before the core value-betting workflow and evidence are mature.

## Audit method and limitation

The public homepage was reviewed visually and through its implementation. Authenticated routes were inspected from their source and data contracts rather than by creating a new account or mutating the live database.

The following local product areas were reviewed:

- Homepage and landing sections
- Signal board and signal detail
- Bet history, profit, ROI, CLV, calendar, and settlement presentation
- Onboarding and bankroll/risk education
- Profile, limits, preferences, and Telegram alert configuration
- Subscription and free-tier flows
- Mobile and desktop navigation
- Motion and reduced-motion behavior
- API input handling, database schema, data fetching, tests, lint, type checking, and production build

The competitor review used current official pages and documentation:

- [ValueBetFactory](https://valuebetfactory.com/)
- [kofai.lt](https://kofai.lt/)
- [OddAlerts](https://www.oddalerts.com/)
- [OddsNotifier](https://oddsnotifier.io/en)
- [OddsJam Positive EV](https://oddsjam.com/betting-tools/positive-ev)
- [RebelBetting Value Betting](https://www.rebelbetting.com/valuebetting)
- [Bet Hero](https://betherosports.com/)

## What Statyk already does well

### Public website

- Distinctive visual identity rather than generic blue SaaS styling.
- Clear Lithuanian positioning focused on local bookmakers.
- Strong typography and consistent color system.
- A product-like animated signal board instead of abstract illustrations.
- Good explanation of true price, value, variance, and CLV.
- Honest language that does not manufacture testimonials or imply that a small sample proves profitability.
- Risk simulations and responsible bankroll framing.
- Respect for the user's reduced-motion preference.

### Authenticated product

- Filters for bookmaker, sport, market family, period, odds, edge, and time to start.
- Automatic board refresh and visible odds-change pulses.
- Fresh, stale, closed, hidden, and newly changed signal states.
- Fair-price comparison and disclosure of interpolated prices.
- Kelly sizing and per-bookmaker stake limits.
- Fixture and selection exposure warnings.
- Automatic settlement and result presentation.
- Profit, ROI, CLV, closing-price performance, a value chart, and a profit calendar.
- Telegram alerts with filters for sports, markets, periods, books, odds, edge, and start time.
- Free-tier and seven-day trial infrastructure.

The internal product is therefore substantially stronger than a basic signal list. Recommendations below deliberately avoid proposing features that already exist.

## Competitor comparison

| Product | Particularly strong features | Lesson for Statyk |
|---|---|---|
| [ValueBetFactory](https://valuebetfactory.com/) | Actual scanner previews, prominent performance evidence, direct bookmaker links, filtering, current EV/CLV, education, and broad bookmaker coverage | Put verifiable product evidence earlier and shorten the path from signal to bookmaker |
| [kofai.lt](https://kofai.lt/) | Very simple Lithuanian message, member-result proof, guarantees, local bookmaker relevance, and direct personal support | Improve local trust and human support, but do not copy profit or legal guarantees without evidence and legal review |
| [OddAlerts](https://www.oddalerts.com/) | Saved strategies, deep football data, alerts, results, odds tools, CSV/API access, and extensive filters | Saved filter views and richer exploration are valuable; its full complexity is inappropriate for Statyk |
| [OddsNotifier](https://oddsnotifier.io/en) | Configurable alert feeds, dropping-odds tools, movement graphs, and closing-line alerts | Add price history and reusable notification presets |
| [OddsJam](https://oddsjam.com/betting-tools/positive-ev) | Direct instructions showing the exact book, market, bet, and suggested amount | Make each signal immediately actionable and reduce manual searching and copying |
| [RebelBetting](https://www.rebelbetting.com/valuebetting) | Exact stake guidance, tracking, settlement, CLV, exports, and visible historical performance | Strengthen execution tracking and show evidence earlier than long explanations |
| [Bet Hero](https://betherosports.com/) | Polished real-product previews, bankroll sizing, mobile presentation, onboarding, and community | Show more of the real application on the homepage and guide the first successful bet |

## Main competitive gaps

### 1. Signal-to-bet action speed

The current signal detail can copy an event and record the displayed bet, but it does not provide a direct route to the exact bookmaker destination.

Recommended additions:

- Make **Open in 7BET**, **Open in Betsson**, or **Open in TopSport** the primary signal action where reliable deep links are possible.
- Provide a single action that copies the selection, market, line, and odds in a structured format.
- Revalidate the signal immediately before opening the bookmaker.
- Warn when the latest odds have fallen below the profitable threshold.
- Record why a bet was skipped: odds moved, selection missing, bookmaker limit, market suspended, or user decision.
- Measure time from signal publication to view, click, and recorded placement.

This is the most important user-workflow gap because a theoretically valuable signal can become worthless while the user manually searches for the market.

### 2. Truthful execution data

The current “Pastačiau” action records the displayed signal odds. Those may not be the odds the bookmaker actually accepted.

The confirmation flow should collect:

- Actual accepted odds
- Actual stake
- Accepted, rejected, or partially limited state
- Optional note
- The displayed odds and suggested stake as editable defaults
- Execution slippage: accepted odds minus displayed odds

Without this, personal ROI and CLV can be systematically inaccurate. The tracker would be measuring the recommendation rather than the executed bet.

### 3. Price-history and signal-lifecycle context

The current product compares the latest bookmaker and fair prices but does not show their history.

Each signal should eventually include a compact chart with:

- Soft-book opening odds
- Current soft-book odds
- Pinnacle or fair-price movement
- The moment the signal crossed the configured value threshold
- Highest observed value
- Signal age and last update time
- Closing price once available
- Clear exact-versus-interpolated status

This would make the product materially more informative without pretending to predict an outcome. It also creates a defensible distinction from a basic Telegram tip feed.

### 4. Prominent and auditable evidence

Track-record and CLV evidence exists, but it appears too far down the homepage and requires more statistical context.

Add a compact evidence strip immediately after the hero containing:

- Independently counted settled fixtures
- Raw signal count shown separately
- Flat-stake ROI and its confidence interval
- Mean and median CLV
- Percentage beating the close
- Maximum drawdown
- Date range and last-update timestamp
- Links to book, sport, market, and edge-band breakdowns
- A methodology page explaining fixture clustering, exclusions, settlement coverage, and data freshness

Do not present `+0.857% ROI` by itself as proof of profitability. The site should distinguish fixture-level evidence, correlated signals, and users' executed results.

### 5. An unfinished payment funnel

The free tier and trial are implemented, but an expired trial reaches a disabled message saying that payments are coming soon. A user who wants to buy cannot convert.

Required production work:

- Checkout
- Subscription creation and renewal
- Cancellation and access-until-period-end behavior
- Payment webhooks
- Failed-payment recovery
- Invoices and plan status
- Idempotent entitlement updates
- Customer support path for billing problems

Until this exists, optimizing lower-priority conversion copy has limited business value.

## Homepage recommendations

### Recommended page order

1. Hero with one primary CTA and one secondary **See live demo** action.
2. Compact verified performance strip.
3. Real interactive product preview.
4. Three-step signal-to-bet workflow.
5. Price-history and fair-price explanation.
6. Bet tracking, automatic settlement, and CLV.
7. Risk, variance, and responsible-use explanation.
8. Pricing.
9. FAQ.
10. Final CTA.

The existing page explains the idea for a long time before reaching its strongest proof. ValueBetFactory, RebelBetting, and Bet Hero show their real product or results much earlier.

### What the hero should answer immediately

- Which bookmakers are covered?
- When was the data last refreshed?
- What exactly will the member receive?
- What happens after clicking a signal?

### CTA hierarchy

- Primary: create an account or start the free trial.
- Secondary: open a live product demo or view verified evidence.
- Do not place several equally strong CTA buttons above the fold.

### Product preview

The current hero board is useful, but it should be possible to inspect a realistic signal detail without registering. A safe demo can use delayed or historical data while retaining the actual interaction design.

### Trust and responsible-use content

- Make evidence methodology easy to find.
- Show sample sizes and date ranges beside performance numbers.
- Explain that CLV is evidence of price quality, not a guarantee of profit.
- Make responsible-gambling language visible before checkout.
- Do not reproduce kofai.lt's legal or anti-limiting claims without qualified legal review.

## Signal-board recommendations

The existing filters are already strong. The next improvements should support discovery and repeatable workflows:

- Sort by highest value, newest, starting soonest, and fastest-moving.
- Save views such as “Basketball 4%+,” “TopSport only,” and “Starts in six hours.”
- Persist the user's selected view across sessions.
- Search by team, league, or competition.
- Pin or watch a fixture.
- Provide an explicit “new since your last visit” mode.
- Show how many signals each filter choice would leave.
- Add a concise “Why this bet?” explanation.
- Display data quality: exact/interpolated, signal age, sharp source, and source freshness.
- Distinguish “profitable now” from “was profitable when detected.”
- Show fixture exposure before the user confirms another correlated position.
- Add a retry/recovery state that preserves the last known board if refresh fails.

The board should remain focused. It does not need social feeds, public comments, or complex statistical models in the primary table.

## Signal-detail recommendations

Recommended information hierarchy:

1. Event, start time, and bookmaker.
2. Exact selection, line, and current odds.
3. Current value and fair odds.
4. Data freshness and exact/interpolated status.
5. Suggested stake and current exposure.
6. Primary bookmaker action.
7. Actual bet confirmation.
8. Price movement and other-book comparison.

Additional safeguards:

- If a signal closes while its detail panel is open, disable the placement action and explain why.
- If odds change, update the suggested stake and potential return before confirmation.
- Never silently preserve an obsolete edge value beside updated odds.
- Make copied information include enough context to identify the exact market and period.

## Bet-tracker recommendations

The existing tracker already includes ROI, CLV, profit, filters, a calendar, a chart, and automatic settlement. Its next useful additions are:

- Edit pending bets.
- Delete incorrectly recorded bets with confirmation.
- Record an audit history for edits and manual settlement corrections.
- Add notes and tags.
- Store displayed versus accepted odds and suggested versus actual stake.
- CSV export.
- Equity curve with drawdown.
- Breakdowns by bookmaker, sport, market family, edge band, and exact/interpolated pricing.
- Fixture-level headline metrics, with signal-level metrics clearly labelled as execution volume.
- “Missing closing price” and “unsettled too long” work queues.
- Execution-quality reporting.
- Personal bookmaker-limit history.

Do not add public leaderboards yet. They encourage misleading comparisons between users with different stakes, samples, execution quality, and correlated bets.

## Onboarding and education recommendations

The current five-step onboarding covers bankroll, bookmakers, signals, risk, and pace. Improve it by making the first useful outcome more concrete:

- End onboarding on a guided sample signal rather than a generic dashboard entrance.
- Explain the difference between fair odds, bookmaker odds, edge, CLV, and profit in context.
- Demonstrate how the suggested stake changes with bankroll and existing fixture exposure.
- Ask for notification preferences after the user understands what a signal contains.
- Provide a later checklist: connect Telegram, inspect a signal, record a bet, and review settlement.
- Explain bookmaker limitations and the possibility that displayed odds are no longer available.

## Notification recommendations

Telegram support is already substantial. Improve it before building multiple new channels:

- Allow named saved alert presets.
- Add pause durations: one hour, until tomorrow, or indefinitely.
- Group repeated changes to the same fixture to avoid noisy alerts.
- Include whether the price is exact or interpolated.
- Include current signal age and movement direction.
- Deep-link back into the exact signal detail.
- Track delivery, open, and placement-confirmation events.
- Retain the existing test-message capability.

Browser push and audio alerts can follow once saved alert feeds and delivery analytics are stable.

## Animation assessment

Statyk is not lacking animation. The homepage already combines:

- A rotating bookmaker word
- An animated signal board
- Background lighting
- A moving ticker
- Section reveals
- Price and number transitions

This is close to the upper useful limit. More decorative animation would make the product feel busier rather than more advanced.

### Recommended functional motion

- Brief green/red pulse when odds improve or deteriorate.
- Smooth insertion and removal of live signals.
- Visible new → aging → stale → closed lifecycle transitions.
- Price-history line drawing when signal detail opens.
- Restrained filter-result count changes.
- A clear successful bet-recorded transition.
- Skeleton states during refreshes.

### Motion rules

- Keep most transitions between 150 and 300 milliseconds.
- Allow only one dominant repeating animation above the fold.
- Stop nonessential animations outside the viewport.
- Continue respecting reduced-motion settings.
- Avoid floating cards, particles, parallax layers, and continuously animated gradients.
- Use motion to explain market state, not merely to decorate the page.

## Mobile and responsive findings

There is a definite mobile navigation defect: the bottom navigation defines four grid columns while rendering only three destinations. This leaves one quarter of the navigation empty and makes the three real actions look misaligned.

Fix the grid and add automated visual checks for:

- 320 × 568
- 360 × 800
- 390 × 844
- 768 × 1024
- 1440 × 900

Highest-risk responsive areas:

- The large rotating hero headline
- Signal-board columns
- Filter menus
- Signal-detail drawer
- Long event and selection names
- Stake controls and potential-return blocks
- The sticky header and safe-area-aware bottom navigation

Tests should use long Lithuanian labels and long team names, not only ideal sample content.

## Architecture and production findings

### 1. Broken lint command

`pnpm lint` fails because the package script calls ESLint but ESLint is not installed. CI therefore cannot enforce the project's lint rules.

Action:

- Install and configure the intended ESLint version and Next.js rules.
- Run lint in CI alongside tests and TypeScript.

### 2. TypeScript build escape hatch

The Next.js configuration contains `typescript.ignoreBuildErrors: true`. The current standalone TypeScript check passes, so the escape hatch should be removed before it conceals a future production defect.

Action:

- Remove `ignoreBuildErrors`.
- Make `tsc --noEmit` an explicit CI job.

### 3. Authentication base URL warning

The production build repeatedly warns that the Better Auth base URL is not configured and will be inferred from requests.

Action:

- Configure the canonical production base URL and allowed hosts.
- Verify callback and redirect behavior on preview and production domains.

### 4. Missing database indexes

The `user_bet` table has a primary key but no useful declared indexes for its main access patterns.

Add and verify indexes for:

- `(userId, placedAt DESC)`
- `(userId, status, startsAt)`
- `(userId, signalId, bookmaker)` where appropriate for duplicate protection
- `eventKey`
- Pending closing-price capture and settlement queries

Use a unique constraint for duplicate protection if the product contract truly forbids the same user/book/signal combination. Application-only prechecks can race.

### 5. Loose bet API contract

The bet POST route converts several arbitrary input values to strings and performs only limited boundary checks.

Action:

- Introduce a shared request schema.
- Restrict bookmaker, market, direction, and sport to known values.
- Apply sensible length and numeric upper bounds.
- Validate dates and event identifiers.
- Reject invalid line/selection combinations.
- Add route-level contract tests.

### 6. Apparently obsolete settings API

`/api/user/settings` appears separate from the current account/preferences path and returns raw exception messages in some failure responses.

Action:

- Confirm whether it is used externally.
- Remove it if obsolete.
- Otherwise use the same parser and safe error contract as current preferences endpoints.

### 7. Large client components

Approximate component sizes during the audit:

- Signal board: 870 lines
- Onboarding flow: 549 lines
- Bet view: 496 lines
- Signal detail: 329 lines
- Profile view: 286 lines

Suggested decomposition:

- Data/query hooks
- Filter and saved-view state
- List/table rendering
- Row lifecycle and motion
- Detail panel
- Bet-entry form
- Metrics and charts
- Domain-specific pure functions

The goal is not arbitrary small files; it is separating polling, mutation, domain calculations, and rendering so they can be tested independently.

### 8. Fragmented client data fetching

Several screens manually implement fetch, loading, errors, retries, refresh, and cache behavior.

Action:

- Create a small shared query layer or adopt an established client-query library.
- Deduplicate simultaneous requests.
- Standardize retry and stale-data behavior.
- Invalidate recent bets after recording a bet.
- Preserve last-known-good data during temporary failures.

### 9. Polling behavior

The signal board polls once per minute and also refreshes when visibility changes.

Near-term action:

- Add request deduplication and prevent overlapping refreshes.
- Add a small random polling jitter so all clients do not refresh simultaneously.
- Pause or slow polling in background tabs.
- Report last successful refresh separately from the current clock.

Server-sent events can be evaluated later if active-user scale and signal urgency justify the added operational complexity.

### 10. Missing browser and visual-regression coverage

The project has useful domain-level unit tests but no visible end-to-end or screenshot regression suite.

Add browser tests for:

- Registration and login
- Onboarding completion
- Free-tier restrictions
- Trial start and expiry
- Signal filtering and saved views
- Stale/closed signal transitions
- Recording actual odds and stake
- Duplicate-bet rejection
- Automatic and manual settlement presentation
- Telegram connection states
- Subscription checkout and cancellation
- Mobile navigation and drawers

### 11. Error handling and observability

Console errors and generic messages are useful during development but insufficient for production diagnosis.

Add:

- Structured error identifiers
- Server-side error monitoring
- Signal-board freshness and API latency metrics
- Settlement lag and missing-closing-price metrics
- Telegram delivery failures
- Checkout/webhook failures
- Privacy-safe funnel analytics

## Features not worth prioritizing yet

- Arbitrage and surebet scanning
- Live-betting infrastructure
- Middles
- Parlay builders
- AI game predictions
- Giant xG/form/referee databases
- Public social feeds
- Public user leaderboards
- Multiple native alert channels before Telegram workflow measurement
- More decorative homepage animation

These are expensive expansions that do not solve the current core questions of execution, evidence, conversion, and reliability.

## Recommended implementation order

### Phase 0: Production hygiene

1. Fix the mobile bottom-navigation grid.
2. Restore working ESLint and add it to CI.
3. Remove ignored TypeScript build errors.
4. Configure the Better Auth production base URL and allowed hosts.
5. Add the required `user_bet` indexes and duplicate constraint.
6. Harden or remove the obsolete settings endpoint.
7. Add schema validation to bet mutations.

### Phase 1: Execution integrity

1. Add actual odds and actual stake confirmation.
2. Add accepted/rejected/limited/skipped states.
3. Revalidate odds immediately before the bookmaker action.
4. Add reliable direct bookmaker actions where possible.
5. Store displayed-versus-executed price and execution delay.
6. Ensure all personal CLV and ROI metrics use executed data.

### Phase 2: Market context

1. Persist time-series price observations required by the UI.
2. Build the compact price-history chart.
3. Show signal age, high-water value, exact/interpolated status, and closing price.
4. Add fastest-moving and newest sorting.
5. Add stale/closed lifecycle clarity.

### Phase 3: Evidence and conversion

1. Rebuild homepage evidence around fixture-level statistics.
2. Move the compact evidence strip directly below the hero.
3. Add a realistic interactive demo.
4. Publish the evidence methodology.
5. Complete billing and entitlement webhooks.
6. Add responsible-use messaging to checkout.

### Phase 4: Repeatable member workflows

1. Saved signal views and alert presets.
2. Team/league search and watched fixtures.
3. Bet editing, notes, tags, and CSV export.
4. Equity curve, drawdown, and execution-quality reporting.
5. Missing-settlement and missing-closing-price queues.

### Phase 5: Quality and scale

1. End-to-end tests for critical journeys.
2. Responsive visual-regression tests.
3. Shared query/cache layer.
4. Monitoring for freshness, settlement, notifications, and payments.
5. Reassess push notifications or SSE based on measured user behavior.

## Suggested success metrics

Product work should be evaluated with measurable outcomes:

- Median signal-to-bookmaker click time
- Median signal-to-recorded-placement time
- Percentage of recorded bets with confirmed actual odds
- Execution slippage by bookmaker
- Percentage of signals that are already stale when opened
- Alert delivery-to-open rate
- Open-to-recorded-bet conversion
- Settlement completion and closing-price coverage
- Trial activation and trial-to-paid conversion
- Mobile versus desktop completion rate
- Fixture-level CLV and ROI with uncertainty
- Support incidents caused by missing markets or confusing bet orientation

## Verification performed during this audit

- Production build: **passed**
- TypeScript `tsc --noEmit`: **passed**
- Unit tests: **95 passed across 14 test files**
- Lint command: **failed because ESLint is not installed**
- Production build warnings: Better Auth canonical base URL is not configured
- Next.js build currently skips TypeScript build failures through configuration

No product source files were intentionally modified as part of the audit. This document records analysis and recommended work only.

