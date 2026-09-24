# Animation opportunities — 2026-09-24 (board t114)

Written for: whoever works on the site's motion next. The owner asked for "more
and better animations".

## Finding first

The landing is already close to its motion budget: line-by-line headline reveal
(`hero.tsx:48-60`), cursor-following floodlight, background sweep and breathe,
staggered CTA/board entrance, a hero board that cycles rows (`hero-board.tsx:37`),
rolling numbers (`motion-primitives.tsx` `Roll`) and in-view reveals in 12 of
the landing sections. More entrance effects there would read as template motion,
not quality.

Also: the site **does not** follow Windows' reduced-motion flag
(`lib/motion-mode.ts`) — animations are on for everyone unless the footer
"Animacijos" switch is turned off. The note on the board saying the owner sees a
frozen site was wrong; if the site looks still to the owner, check that switch.

The real gaps are in the app, where states change with no bridge.

## Opportunities (ordered by leverage)

| # | Location | Today | Purpose | Frequency | Motion |
|---|---|---|---|---|---|
| 1 | `signal-detail.tsx` "Pažymėta" after recording a bet | the button is replaced instantly | State indication | a few times/day | confirmation enters from `opacity 0, scale .97`, 220 ms, ease `[0.22,1,0.36,1]` (the repo's EASE); check icon draws in (`pathLength 0→1`, 260 ms). Calm mode: opacity only |
| 2 | `billing-card.tsx` cancel panel | appears/disappears instantly | Preventing a jarring change | rare | `opacity 0, y -4` → settled, 200 ms EASE, same path out |
| 3 | `suggest-book.tsx` form open/close and the "Užrašėm" line | teleports | Preventing a jarring change | rare | same recipe as #2 |
| 4 | First full board after starting the trial (`unlock-view.tsx:72`) | a toast, then the board | Delight (first-time only) | once per member | locked rows unblur `blur(6px)→0` with 40 ms stagger, max 8 rows, 400 ms. Needs a one-time flag; not built yet |
| 5 | Onboarding finish → board | route change only | Delight (once) | once per member | progress bar fills to full and the button shows a check for 300 ms before navigating. Not built yet |

## Rejected

- More landing section entrances — every section already reveals; stacking more is decoration.
- Animating odds/edge numbers on the signal board — data the member is reading and acting on; motion would hinder.
- Board row hover lift — tens of times a day; the existing row enter/exit (`signal-board.tsx:859`) is enough.
- Equity/profit chart line drawing (`equity-chart.tsx`) — functional data; decoration hinders.

## Built on 2026-09-24

#1, #2 and #3 (commit "Bridge the three state changes that teleported"). #4 and
#5 stay on the board under t114.
