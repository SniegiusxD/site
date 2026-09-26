# Overnight tasks for a cloud Claude session: site, night 2 (motion and appeal)

> **Status on 2026-09-26:** Claude already did many of these tasks (each is
> marked). Still open:
> - Task 1 (motion CI tests);
> - Task 3 (row grows into its detail);
> - the rest of Tasks 4 and 6;
> - Task 10 (buttons, toggles);
> - Task 14 (progress spring);
> - Task 17 (empty and loading states);
> - Part 3 (Tasks 18, 20, 21), **under the legal rule below**.
>
> Start with those.

Written for: a Claude Code cloud session with access to the GitHub repository
`SniegiusxD/site` and nothing else. You work alone for hours, and nobody will
answer questions. When something is ambiguous, choose the conservative
option, write the decision down, and keep going.

Last night's session did 8 tasks in about 2 hours
(`planning/CLOUD_OVERNIGHT_REPORT_2026-09-24.md`). Tonight's list is about
three times that. Work in order. When a task is blocked, write down why and go
on to the next one. Do not stop early.

## What you have and what you do not

- You have:
  - this repository;
  - Node and pnpm;
  - the unit tests and a production build;
  - Playwright;
  - a local Postgres, if the container has one. Last night it did: create
    `statyk_test` and seed it with `scripts/seed-member-ci.ts`, as CI does.
- You do **not** have `.env.local`, the production database, Stripe, Upstash,
  the VM or Vercel.
  - Never try to obtain secrets.
  - Never call production URLs.
  - Never add real keys.

## Where to start and where to push

1. Start from branch `claude/round28`, which has this file.
2. Create branch `cloud/overnight-2`. Commit small, one idea per commit, with
   messages that say why.
3. Push it and open a **draft** pull request into `claude/round28`. Never push
   to `main` or `redesign`, or to anyone else's branch. `main` deploys to
   production.
4. Before every push, all of these must pass:
   - `pnpm install --frozen-lockfile`;
   - `npx tsc --noEmit`;
   - `pnpm lint` (zero warnings);
   - `pnpm test`;
   - `BETTER_AUTH_SECRET=ci-dummy-secret-at-least-32-characters-long pnpm build`;
   - `CI=1 pnpm test:e2e`.
5. End with `planning/CLOUD_OVERNIGHT_REPORT_2026-09-25.md`:
   - what is done and what is not;
   - the decisions you made;
   - a list of every new moment, with the file and how to trigger it by hand,
     so the owner can try each one.

## Why tonight is about motion

The owner has said many times that the site must look high-end and alive:
"appeal, I cannot say this enough … animations MORE". They also asked that
motion be tied to **moments**: the "+1 statymas" pill that flies into the
daily counter (`components/app/board/bet-flight.tsx`) is their favourite
example. Motion should answer something that just happened. It should not be
decoration on everything.

## Motion rules (hard)

- **Transform and opacity only.** `lib/__tests__/globals-css.test.ts` enforces
  this for keyframes; follow the same rule in framer-motion.
- **No layout shift.** Reserve space for anything that appears after load. The
  CLS tests in `tests/e2e/perf.ts` and both specs must stay green.
- **Calm mode.** The site ignores the OS reduced-motion flag on purpose (the
  owner's Windows has animations off; see `lib/motion-mode.ts`). The footer
  "Animacijos" switch sets `<html data-motion>`. Every new moment must:
  - check `useReducedMotion()` from `@/lib/use-reduced-motion` or the CSS
    `html[data-motion=…]` selector;
  - in calm mode, fall back to an instant state change that still says what
    changed (a colour, a label).
- **Ease.** The repo uses `EASE = [0.22, 1, 0.36, 1]`, and Task 0 turns it into
  tokens.
- **Durations.** Answers to an action take 150–350 ms. Celebrations take at
  most 900 ms. Nothing loops forever except a live-status dot.
- **Responsible gambling.** Never reward betting *more*: no confetti, no
  streaks, no "one more?". Celebrate **quality** (beating the close, being
  disciplined), not volume. A loss is shown calmly and never in alarm red
  motion.
- **Voice.** UI copy is Lithuanian, plain, no hype, and never promises profit.
- **Phones first.** Check 390 px and 1440 px, with no sideways scroll.
- **Do not touch:**
  - billing (`lib/billing/*`, `app/api/billing/*`);
  - auth and rate limits;
  - `lib/admin*`;
  - `.github/workflows/*`;
  - schema, except for the additive changes named in this file.

---

## Part 1: foundation

### Task 0: motion tokens and the audit (t159)

**Already done by Claude on 2026-09-26:** `lib/motion.ts` exists and all components import it; the audit is `planning/MOTION_AUDIT_2026-09-26.md`. Use them and skip this task.

- Create `lib/motion.ts` with:
  - `EASE`;
  - durations (`tap`, `quick`, `settle`, `celebrate`);
  - two springs (`snappy`, `soft`);
  - a stagger helper.
- Replace the literal values in `components/**` with the tokens, one commit per
  area (landing, board, tracker, profile, onboarding).
- Write `planning/MOTION_AUDIT_2026-09-25.md`:
  - every existing animation (the `kr-*` keyframes in `app/globals.css` and the
    framer-motion uses): where it is, and what triggers it;
  - screens and actions that have **no** response today.

  The remaining tasks fill most of those gaps. Add any extra gaps you find as
  "Found during audit" at the end, and do the small ones.

### Task 1: motion quality tests in CI (t171)

- Extend the existing tests so that, for every page in both specs, calm mode
  (`data-motion` set to calm) leaves no running animation except the live dot.
- Add a unit test: every framer-motion `animate` or `transition` object in
  `lib/motion.ts` presets uses only `x`, `y`, `scale`, `rotate` and `opacity`.
- Keep it under 20 s in total, with no flaky timing.

## Part 2: members' app moments

Find each place yourself (`components/app/**`). Each task is one moment. Test
each one in the browser against the seeded database.

### Task 2: page transitions (t160)

**Already done by Claude on 2026-09-26 (`3e26b73`); skip this task.**

- Moving between Signalai, Statymai, Profilis and Pagalba cross-fades with a
  short slide in the direction of the nav.
- Use the View Transitions API where the browser supports it, and fall back to
  nothing.
- On phones, the active nav item's indicator slides to the new item
  (`layoutId`).

### Task 3: a board row grows into its detail (t161)

- On desktop, the selected row's odds and value numbers move into their place
  in the detail pane with a shared `layoutId`.
- On phones, the sheet (`components/app/board/phone-sheet.tsx`) opens with a
  spring and can be dragged down to close. Past the threshold it closes;
  otherwise it snaps back.

### Task 4: a live board (t162, t176)

**Partly done by Claude on 2026-09-26:** the "N nauji signalai" pill (`components/app/board/new-signals-pill.tsx`). New rows already glow and moved prices already flash (`pollPulses`). Still to do: the NumberFlow roll with tint in the rows, and closed signals fading and collapsing.

`use-live-board.ts` polls. When a poll lands:
- **New signal:** it does not push the list while the member is scrolled
  down. Show a pill "3 nauji signalai" at the top. Tapping it scrolls up, and
  the new rows light up one by one (stagger of about 60 ms).
- **Changed price:** the number rolls (NumberFlow). It tints green when better
  for the member and grey when worse, then fades back.
- **Closed or started signal:** it fades and collapses. The space animates
  with transform, so nothing below jumps.

### Task 5: the price changed while you were looking (t174)

**Already done by Claude on 2026-09-26 (`fb0e661`); skip this task.**

In the open signal detail, when a poll changes the price:
- the old odds are struck through and fade out, and the new odds roll in;
- if the value is gone (below the floor), the value badge turns grey with
  "Vertės neliko".

### Task 6: "Tuoj prasideda" (t175)

**Mostly done by Claude on 2026-09-26:** the ring and the amber time (`components/app/board/starting-soon.tsx`). Still to do: the slide into "Užsidarę" at kickoff.

- Under 15 minutes to the start, the row's start time becomes a small
  countdown ring that empties.
- At the start, the row slides into the "Užsidarę" state.
- The ring is one SVG `stroke-dashoffset`, so use a transform-based trick or a
  `scaleX` bar instead if you must stay on transform and opacity. Say which
  one you chose.

### Task 7: a bet settles, and the money flies to the bankroll (t163, t172)

**Already done by Claude on 2026-09-26 (`cf26f1c`); skip this task.**

In `/statymai`, when a bet is graded since the member's last visit (compare
with the stored last visit):
- the result appears one bet at a time;
- **won:** "+12,40 €" rises from the row and flies into the bankroll figure,
  which rolls up (reuse the flight idea from `bet-flight.tsx`);
- **lost:** the row settles into its lost state quietly, and the bankroll
  rolls down without any flight;
- **push or void:** a neutral grey.

Show each result only once. Store which result ids have already been
celebrated.

### Task 8: "Aplenkei uždarymą" (t173)

**Already done by Claude on 2026-09-26 (`cf26f1c`); skip this task.**

- When a bet gets its closing price and beat it, a small badge pops once:
  "CLV +3,2 %" with a check.
- This is the celebration that matters, because it rewards quality, not
  luck. Add a line under the badge the first time a member sees it:
  "Tai svarbiausias rodiklis: ilgainiui jis lemia rezultatą."

### Task 9: star to "Sekami", hide with undo (t177)

**Already done by Claude on 2026-09-26 (`27c97ef`; hiding already had undo); skip this task.**

- Starring a signal sends a small star into the "Sekami" filter chip, and the
  chip's count bumps.
- Hiding a signal collapses the row and leaves "Paslėpta · Atšaukti" in its
  place for 5 s.

### Task 10: micro-interactions (t165, t178)

**Partly done by Claude on 2026-09-26 (`8af5500`):** the segmented control slides and copy pops a check in place. Still to do: button press on the main buttons, toggles on a spring, chip pop.

- Buttons press in (`scale: 0.97`).
- Copy buttons morph their icon into a check **in place**, instead of a toast
  at the bottom.
- The `Segmented` control's background slides between options.
- Toggles use a spring.
- Chips pop slightly on select.

One commit per component.

### Task 11: daily target reached, calmly (t179)

**Already done by Claude on 2026-09-26 (`c59cb69`):** the daily target is now a daily *limit* everywhere (board card, month view, onboarding, profile). Skip this task.

When `daily-target.tsx` reaches its target:
- the ring completes and softly glows once;
- the text reads "Šiandienos planas įvykdytas";
- nothing suggests betting more (see the responsible-gambling rule). Any
  existing copy that does suggest it gets removed.

### Task 12: the month calendar fills (t180)

**Already existed** (the calendar cells and month bars stagger in on open). Skip this task.

- When `month-dialog.tsx` or `profit-calendar.tsx` opens, the days fill in
  order (stagger), and the month total rolls up.
- It happens once per open.

### Task 13: Telegram connected (t181)

**Already done by Claude on 2026-09-26 (`85d024a`); skip this task.**

- When `telegram-card.tsx` sees the link succeed, a paper plane flies across
  the card, and the card switches to its connected state.

### Task 14: onboarding (t166, t182)

**Partly done by Claude on 2026-09-26 (`1146a46`):** the bankroll-step amounts roll. Steps already slide by direction. Still to do: the progress bar on a spring.

- Steps move left or right depending on direction.
- The progress bar fills with a spring.
- The stake examples roll **live** as the member types the bankroll and picks
  the risk level (NumberFlow). This is the moment where they see what the
  numbers mean for them.

### Task 15: offline and back (t183)

**Already done by Claude on 2026-09-26 (`ba79a94`); skip this task.**

- When the browser goes offline, or two polls in a row fail, a thin banner
  slides down: "Nėra ryšio: kainos gali būti pasenusios".
- When the connection is back, it says "Atnaujinta" with a short flash, then
  leaves.
- Reserve no space for it: use an overlay, so there is no layout shift.

### Task 16: pull to refresh on phones (t184)

**Already done by Claude on 2026-09-26; skip this task.**

- On `/signalai` and `/statymai` at phone width, pulling down past a threshold
  shows a mark that rotates with the pull. Releasing it triggers a refresh,
  and the mark snaps into a check.
- Do not fight the browser's native overscroll. Use `overscroll-behavior` so
  there are not two refreshes.

### Task 17: empty and loading states (t167)

- Every skeleton uses one shimmer (`kr-shimmer`).
- Every empty state gets a small, still icon that moves once on entry, one
  sentence that says what to do, and a button that does it.
- Walk every screen.


## Legal rule added 2026-09-25 (read before Part 3)

Lithuanian law (ALĮ 10 str. 19 d. and LPT's 2025-06-30 guidance) treats a
**public** page that names a betting company, or links to one, as prohibited
gambling advertising. It also bans anything that urges people to bet.

- On public pages (landing, `/rezultatai`, share cards, guides): **no book
  names, no book logos, no links to books, and no "pays more" wording.**
- Inside the logged-in app, book names as plain text are fine for now.
- The minimum age is 21 (already fixed in `a7652c7`).

Therefore:
- **Task 18** plays real signals **without the book name**: sport, event,
  price → close → CLV.
- **Task 19 is cancelled.** Do not add a flash that highlights an LT book
  paying more.
- **Task 25**'s card must not name books.

## Part 3: public pages

### Task 18: a live landing hero from real signals (t164)

- The hero board (`components/landing/hero-board.tsx`) should play **real,
  already started** signals from the public record (the data behind
  `/rezultatai`, `lib/public-results-store.ts`).
- For each signal, animate: price found → close → CLV.
- Every few seconds, move to the next one.
- It is server-rendered with fixed dimensions, so there is no layout shift.
- It falls back to the current demo when there is no data.
- It never shows a signal that has not started (that would leak paid
  signals).

### Task 19: the odds strip flashes when a LT book pays more (t185)

- In `odds-ticker.tsx` or `live-strip.tsx`, when a Lithuanian book's price is
  above the fair price, the cell flashes green once with "+3,1 %".

### Task 20: reveals on the results page (t169)

- On `/rezultatai`, the summary figures roll up once.
- The group tables' rows stagger in.
- The list re-orders smoothly when the book or sport filter changes
  (`layout`).
- The per-day bars already grow (`kr-bar-grow`). Keep them.

### Task 21: visual depth pass (t168, t170)

- Layered surfaces (a subtle border plus an inner highlight), consistent
  radii by hierarchy (not one radius everywhere), and a type-scale check.
- Pages: pricing, FAQ, profile, help, kontaktai and the auth pages. Raise them
  to the landing's level.
- The FAQ accordion opens smoothly (height via a grid-rows trick or scaleY on
  the content, not animating `height`).
- Take before and after screenshots at 390 and 1440 px, commit them under
  `planning/screens/2026-09-25/`, and link them from the report.

## Part 4: small features the owner asked for

### Task 22: "Pranešti, kai statymas atsiskaito" setting (for t152)

**Already done by Claude on 2026-09-26 (`e097e54`); skip this task.**

- Add `user_settings.notifySettled boolean NULL`. It is additive, and NULL
  means on. Put it in `lib/db/ensure-app-schema.ts`, using `runLockedDdl` like
  the other columns.
- In the profile, add a toggle next to the Telegram card:
  "Pranešti Telegram, kai statymas atsiskaito".
- Save it through the existing `app/api/preferences` route, with a unit test.
- The Telegram bot reads the column (another repository).

### Task 23: the brand in one place (prep for t150)

**Already done by Claude on 2026-09-25 (`25ec348`); skip this task.**

- The site will be renamed **valuestatymai**; the exact spelling and domain
  are not decided yet.
- Make sure every visible brand name, email sender, share card, metadata
  title, manifest, legal page and FAQ answer reads from `lib/brand.ts`.
- Add a unit test that fails if the current brand string appears anywhere in
  `app/`, `components/` or `lib/` outside `lib/brand.ts`.
- **Do not rename.** After this task, renaming must be a one-file change.

### Task 24: where onboarding loses people (t153)

**Already done by Claude on 2026-09-26 (`140cc24`); skip this task.**

- Record anonymous onboarding step events in our own database, with no third
  parties:
  - new additive table `onboarding_event (id, session_hash, step, action, at)`;
  - `session_hash` is a random per-browser id, not the user id;
  - keep 90 days.
- Add an endpoint with a rate limit (reuse the existing limiter helpers
  without changing them).
- On the owner page, add a funnel: started → completed, for each step, over 7
  and 30 days.
- Update the privacy policy with one sentence.

### Task 25: a member's CLV share card (t156)

**On hold (legal): a public card promoting betting results may count as encouraging gambling under ALĮ 10 str. 19 d. Skip it until LPT answers (t192).**

- `/api/og/member/[publicId]`, or a signed route: a next/og card with the
  member's month CLV, share beating the close, and number of bets.
- **No euro amounts, and no names unless the member opts in.**
- In the profile, add a "Dalintis" button with the card preview. Sharing is
  off by default, and the member turns it on.
- The card is in the site's brand (`lib/og.tsx`).

## If you finish early

- Walk every page in calm mode and in normal mode on a phone, and list
  anything that still looks static or cheap. Fix the small ones.
- Otherwise stop and write the report. Do not invent product features beyond
  this list.
