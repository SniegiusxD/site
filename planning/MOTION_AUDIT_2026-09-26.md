# Motion audit — 2026-09-26

Written for whoever adds motion next (the cloud session, Claude). It covers
what moves today, where, and what triggers it, plus the gaps. The board tasks
are t159–t185; the cloud list is `CLOUD_OVERNIGHT_TASKS_2026-09-25.md`.

## The vocabulary (`lib/motion.ts`, from 2026-09-26)

- `EASE` (the house curve), `EASE_CSS` (the same, for CSS), and `EASE_FILL`
  (for bars and calendars that fill).
- `DURATION`: `tap` 0.15, `quick` 0.2, `settle` 0.3, `reveal` 0.5 and
  `celebrate` 0.75 seconds.
- `SPRING`: `snappy` (toggles, chips, indicators) and `soft` (sheets,
  panels).
- `stagger(i)`: 60 ms per item, capped at 0.6 s.

Eighteen components used to define the curve themselves; all of them now
import it. New code uses these values, not literals.

## What moves today

### Landing and public pages (CSS keyframes in `app/globals.css`)

| Keyframe | Where | Trigger |
|---|---|---|
| `kr-line`, `kr-fade-up`, `kr-rise`, `kr-pop`, `kr-fade` | hero, journey, header | Page load, once |
| `kr-sweep` | hero | Load, once |
| `kr-breathe`, `kr-cta-glow` | hero and final CTAs, journey | Loop on the main button |
| `kr-row-drop` | auth side panel, journey | A new demo signal drops in (loop) |
| `kr-ring` | hero board, auth panel, journey, scenario chart | The live dot (loop) |
| `kr-scan` | journey | The scan line (loop) |
| `kr-fill` | journey | Bars fill on view |
| `kr-float` | how-it-works | Gentle float (loop) |
| `kr-bar-sweep` | proof | Bars sweep in on view |
| `kr-bar-grow` | `/rezultatai` per-day CLV | Bars grow from zero, once |
| `kr-drift` (`.kr-stripes`) | hero and auth backgrounds | Slow stripes (loop) |

### Members' app (framer-motion)

| Component | What moves |
|---|---|
| `board/bet-flight.tsx` | **"+1 statymas"**: a pill flies into the daily counter (the owner's favourite example) |
| `signal-board.tsx`, `signal-row.tsx` | Rows enter; price flashes when a poll changes it (`pollPulses`); the selected row |
| `signal-detail.tsx` | Panel content enters |
| `board/phone-sheet.tsx` | The phone sheet slides up |
| `board/daily-target.tsx` | The ring fills |
| `month-dialog.tsx`, `profit-calendar.tsx` | The dialog opens; calendar cells |
| `bankroll-dialog.tsx`, `billing-card.tsx`, `suggest-book.tsx`, `trial-recap.tsx`, `help-view.tsx` | Open and close, expand |
| `onboarding-flow.tsx` | Steps slide by direction; a "done" beat |
| `bets-view.tsx` | Rows enter |

## Keyframes defined but used nowhere

`kr-shimmer`, `kr-pulse`, `kr-toast`, `kr-dots`, `kr-tg`, `kr-tg-prev`,
`kr-swap-a`, `kr-swap-b`; and the classes `.kr-row-in` and `.kr-expand`.

They are left in place on purpose. `kr-shimmer` is the planned single
skeleton shimmer (t167), and `kr-swap-a/b` suit a number rolling over. Remove
any still unused after the cloud round.

## Gaps: actions with no visible answer today

| Moment | Where | Task |
|---|---|---|
| Moving between app pages | app shell nav | t160 |
| A row grows into its detail (shared layout) | board → detail | t161 |
| A new signal lands without shifting the list ("3 nauji") | board poll | t162, t176 |
| A closed or started signal leaves | board poll | t162 |
| The price changes while the detail is open | signal detail | t174 |
| "Tuoj prasideda" countdown | board row | t175 |
| A bet settles; the win flies into the bankroll | `/statymai` | t163, t172 |
| "Aplenkei uždarymą" CLV badge | `/statymai` | t173 |
| A star flies to "Sekami"; "Paslėpta · Atšaukti" when hiding | board | t177 |
| Copy confirms at the button, not in a toast | detail, rows | t178 |
| The daily target completes, calmly | daily target | t179 |
| The month calendar fills on open | month dialog | t180 |
| Telegram connected (paper plane) | Telegram card | t181 |
| Onboarding sums roll with the bankroll | onboarding | t182 |
| Offline, then back online | app shell | t183 |
| Pull to refresh on phones | board, journal | t184 |
| **Found during the audit:** a break starts (the new Pertrauka card) | profile | Add a calm confirm state (the card switches from the choice to "Pertrauka iki …" instantly); no celebration by design |

The landing's "LT book pays more" flash (t185) is **cancelled** for legal
reasons (`LEGAL_CHECK_LT_GAMBLING_ADS_2026-09-25.md`).
