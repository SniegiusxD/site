# Cloud overnight report — site, 2026-09-25 (night 2: motion and appeal)

Branch `cloud/overnight-2` (from `claude/round28`), draft PR
[SniegiusxD/site#7](https://github.com/SniegiusxD/site/pull/7) into `claude/round28`.
Tasks from `planning/CLOUD_OVERNIGHT_TASKS_2026-09-25.md`, one idea per commit.

## How it was checked

Before every push: `pnpm install --frozen-lockfile`, `npx tsc --noEmit`,
`pnpm lint` (zero warnings), `pnpm test`, the production build with
`BETTER_AUTH_SECRET=ci-dummy-secret-at-least-32-characters-long`, and
`CI=1 pnpm test:e2e` against a local Postgres 16 `statyk_test` seeded with
`scripts/seed-member-ci.ts`, as CI does.

The container had Chromium build 1194, and `@playwright/test` 1.63 expects 1243.
I linked the installed headless shell under the expected path. This changed
the container only, not the repo.

Final state: 411 unit tests (up from 401), and 67 e2e checks passing plus the
one intentional skip (up from 65). An earlier version of this report said 77:
that count included my uncommitted `zz-local-*` probes. Browser probes for the moments live in
`tests/e2e/zz-local-*`, which is excluded in `.git/info/exclude` and not
committed.

## Done

| Task | State | Commit |
| --- | --- | --- |
| 0 motion tokens and audit | Skipped: already done (`lib/motion.ts`, `planning/MOTION_AUDIT_2026-09-26.md`) | — |
| 1 motion tests in CI (t171) | Done | `4d4dff9` |
| 2 page transitions (t160) | Done | `45c3aaf` |
| 3 row grows into detail, sheet (t161) | Done (see decisions) | `6806db6` |
| 4 live board (t162, t176) | Remaining parts done | `1e4a3ea` |
| 5 price changed while looking | Skipped: already done | — |
| 6 "Tuoj prasideda" (t175) | Remaining part done | `cedcc8f` |
| 7, 8, 9 | Skipped: already done | — |
| 10 micro-interactions (t165, t178) | Remaining parts done, one commit each | `95eaff6`, `15c22de`, `bce6c58` |
| 11, 12, 13 | Skipped: already done or already existed | — |
| 14 onboarding (t166) | Remaining part (progress bar) done | `15a9a24` |
| 15, 16 | Skipped: already done | — |
| 17 empty and loading states (t167) | Done | `c5d7f49`, `a85a304` |
| 18 live landing hero (t164) | Done | `27ee545` |
| 19 LT book flash | Cancelled by the legal rule; not done | — |
| 20 results page reveals (t169) | Done | `85d6a9b` |
| 21 visual depth (t168, t170) | Done | `9cb0ee4` |
| 22, 23, 24 | Skipped: already done | — |
| 25 CLV share card | On hold (legal, t192); not done | — |

### Task 1: motion quality tests
- `tests/e2e/perf.ts` has two new helpers. `useCalmMotion(page)` starts a page
  in calm mode. `runningAnimations(page)` lists
  `document.getAnimations()` that are still running.
- The live dot is marked `data-live-dot` and is the one thing allowed to keep
  running.
- The public spec has one test that walks every public page in calm mode. The
  member journey walks `/signalai`, the detail, `/statymai`, `/profilis` and
  `/pagalba`.
- Each page uses `expect.poll` up to 3 s, not a fixed wait. Total time is
  about 5 s per project.
- I checked that the detector is not vacuous. In normal mode the landing
  reports `kr-drift`, `kr-sweep`, `kr-breathe`, `kr-cta-glow`, `kr-ring` and
  others.
- `lib/motion.ts` gained `PRESET` (`rise`, `pop`, `fade`, `press`).
  `lib/__tests__/motion.test.ts` checks three things:
  - every preset state uses only x, y, scale, rotate and opacity;
  - transitions carry only timing keys;
  - the durations stay inside the rules (answers ≤ 350 ms, celebrations ≤ 900 ms).

## Decisions

1. **Task 2 uses the View Transitions API directly**, not Next's experimental
   flag. `useNavTransition` starts a transition on a nav click and resolves it
   when the new pathname commits, with a 1.5 s safety timeout. Only the main
   column is named (`app-main`), so the sidebar and bottom nav stay still.
   Browsers without the API, modifier-clicks and calm mode navigate as before.
2. **Task 3 uses FLIP instead of a shared `layoutId`.** On desktop the row
   stays on screen while the detail is open. A shared `layoutId` would hide the
   row's own number, because framer keeps only one visible element per id.
   `FlipFrom` measures the row's number (`data-flip`) and settles the detail's
   number into place with a transform. The phone sheet already closed past a
   drag threshold and snapped back otherwise; it now opens on `SPRING.soft`.
3. **Task 4: a worse price is tinted grey (`text-haze`), not red.** The motion
   rules say a move against the member is not an alarm. The down arrow and its
   screen-reader text stay. The compact row now rolls with NumberFlow too.
4. **Task 6: the ring stays drawn state.** It is a `stroke-dashoffset` set on
   each 30 s board tick and never animated, so it did not need a transform
   trick. The new part is that at kickoff the row leaves the open list by
   sliding *down*, toward "Užsidarę". Any other exit (closed, filtered, hidden)
   fades to the side. The board passes its clock as AnimatePresence `custom`
   so each row picks its exit.
5. **Task 10: one `.kr-press` class**, not framer, for button presses. It
   lists its own transition properties, so a utility's `transition-colors`
   cannot swallow the scale. Buttons that already had `active:scale-[0.97]`
   were left alone. Only the chip the member just picked pops, so nothing pops
   on page load. The Animacijos knob animated `left`; it is now a transform.
6. **Task 14:** the progress bar animated `width`. It is now `scaleX` from the
   left on a spring.
7. **Task 17:** `.kr-skeleton` finally uses the `kr-shimmer` keyframes, which
   were defined but not used. It replaces `animate-pulse`, the statymai spinner
   and the "Įkeliama…" text lines; screen readers still hear "Įkeliama".
   `EmptyState` is used on the board and statymai. On the board, the button is
   the fix for whichever filter emptied the list (Rodyti visus, Išvalyti
   paiešką, Rodyti visas kainas). Smaller inline empties ("Įrašų dar nėra",
   "Pagal pasirinktus filtrus statymų nėra") stay as text.
8. **Task 18: the fallback is the existing captured demo, as the task said.**
   That demo names bookmakers (see "Not done" below). The new record hero:
   - is never given a book, because `HeroRecordSignal` has no field for one
     (unit-tested);
   - drops unstarted signals a second time on top of the SQL;
   - dims nothing, because axe failed on 30 %-opacity pending cells. Instead a
     ring moves from "Rasta kaina" to "Uždarymas" to "CLV" as each step lights.
9. **Task 20:** the summary figures already rolled up once, and the day bars
   already grew; I kept both. Group-table rows use `kr-row-in` with a capped
   stagger. The list animates `layout="position"` (transform) on filter
   changes.
10. **Task 21: one `.surface` class** (hairline, a top highlight and a soft
    drop) and a radius scale: page cards 22 px, tiles 14 px, controls 12 px.
    Inputs inside cards sink to `bg-night/60`. The FAQ already opened with the
    grid-rows trick, so I left it. The type scale was consistent enough that I
    changed nothing. Screenshots:
    [`planning/screens/2026-09-25/`](screens/2026-09-25/), with `before-*` and
    `after-*` for kontaktai, prisijungti, registracija, slaptazodis, kaina
    (pricing), duk (FAQ), profilis and pagalba, each at 390 and 1440 px.

## Not done, and things the owner should know

- **The public pages still name bookmakers, which conflicts with the new legal
  rule.** Tonight's list did not ask for a site-wide cleanup, and it would
  change the landing's core copy, so I only flag it. The main places:
  - the landing headline rolls "kontora → 7BET → TopSport → Betsson"
    (`components/landing/hero.tsx`, `WORDS`);
  - the hero subtitle names all three books;
  - `BookMark` logos and names appear in `hero-board.tsx` (the new fallback),
    `demo-signal.tsx` (/demo), `journey.tsx`, `how-it-works.tsx`,
    `closing-line.tsx`, `calculator.tsx` (/skaiciuokle) and `auth-aside.tsx`;
  - `/rezultatai` has a "Kontora" filter and a book column
    (`results-list.tsx`).
- **The landing has looping ambient animations in normal mode:** `kr-drift`,
  `kr-sweep`, `kr-breathe` and `kr-cta-glow`. The rule "nothing loops forever
  except a live-status dot" says they should go. I left them because they
  predate tonight and are part of the landing's look. Calm mode stops them, and
  the new test proves it. The `StartingSoon` ring also pulses (`animate-pulse`)
  for up to 15 minutes.
- Task 19 (cancelled) and Task 25 (on hold) were not started.

## Follow-ups after the first pass

- **The section slide waited for the loading skeleton** (`279cc1b`). The
  transition resolved as soon as the URL changed, which is when Next shows
  `app/(app)/loading.tsx`, so each slide landed on grey blocks. It now resolves
  once the main column (`data-app-main`) no longer holds the `aria-busy`
  skeleton, still capped at 1.5 s. Browser probe: before, 4 of 4 section changes
  snapshotted the skeleton; after, 0 of 4.
- **The row-to-detail flight is now verified, and faster.** With a second
  signal added to the local database only, the probe tracked the detail's odds
  frame by frame. They start at the row (636,777 vs the row's 635,779), grow
  from 37 to 46 px, and land in about 400 ms. The pane used to wait for the old
  detail's exit first, which delayed the flight by about 230 ms. `popLayout`
  now mounts the new detail at once (`ce7d9d9`), and the
  flight starts on the first frame.
- The owner decided to keep the bookmaker names on public pages as they are.

## Every new moment, and how to try it

| Moment | Where | How to trigger it |
| --- | --- | --- |
| Section slide in nav direction | `components/app/use-nav-transition.ts`, `app/globals.css` (`vt-*`) | Logged in, go Signalai → Profilis (slides left), then back (slides right). |
| Phone nav indicator | `components/app/app-shell.tsx` | At phone width, tap between bottom-nav items: the green bar slides. |
| Odds and value grow into the detail | `components/app/board/flip-from.tsx`, `signal-row.tsx` (`data-flip`) | Desktop `/signalai` with two or more signals: click a row that is not selected. |
| Phone sheet on a spring | `components/app/board/phone-sheet.tsx` | Phone width: tap a signal. Drag the handle down a little (it snaps back) or far (it closes). |
| Price roll with tint, compact too | `components/app/signal-row.tsx` | Wait for a poll that moves a price, or press "Atnaujinti" after the scanner updates. Better is green; worse is grey. Try it in "Kompaktiškas" too. |
| Closed row slides out | `signal-row.tsx` (`leaveVariants`) | Hide a signal, or narrow a filter: the row fades to the side and the rows below close up. |
| Kickoff row slides down | `signal-row.tsx`, `signal-board.tsx` (`custom={now}`) | Keep `/signalai` open across a signal's start time: on the next 30 s tick, the row drops toward "Užsidarę". |
| Button press | `.kr-press` in `app/globals.css` | Hold down "Siųsti" on /kontaktai, "Į signalus", the unlock buttons, and so on. |
| Animacijos toggle | `components/motion-toggle.tsx` | Footer, "Animacijos": the knob springs. |
| Chip pop | `components/app/chip-group.tsx` | `/profilis`, "Kokius signalus rodyti": pick another chip. |
| Onboarding progress spring | `components/app/onboarding-flow.tsx` | `/pradzia` with a new account: "Toliau" and back. |
| Shimmer skeletons | `.kr-skeleton`; `app/(app)/loading.tsx`, `bets-view.tsx`, `billing-card.tsx`, `bankroll-dialog.tsx`, `profile-view.tsx` | Throttle the network in devtools and open `/statymai`, `/profilis` or the bankroll dialog. |
| Empty states with a fix button | `components/app/empty-state.tsx`, `signal-board.tsx`, `bets-view.tsx` | `/signalai`: search "zzz", then "Išvalyti paiešką". A new account's `/statymai`. |
| Record hero | `components/landing/hero-record.tsx`, `lib/hero-record.ts` | `/` with finished signals that have a close: price, then close, then CLV light up, and the next one comes every 5.6 s. Hover to hold; the dots switch signals. |
| Results rows and re-order | `app/rezultatai/page.tsx`, `components/landing/results-list.tsx` | `/rezultatai`: the group tables' rows come in turn; change the sport filter and watch the rows slide. |
| Layered surfaces | `.surface` | `/kontaktai`, `/prisijungti`, `/profilis`, `/pagalba`, landing "Kaina". |

Every one of these is instant in calm mode (footer "Animacijos" off), and
`calm mode leaves nothing moving` checks it on every page in both specs.
