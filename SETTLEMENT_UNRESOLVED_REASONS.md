# Settlement unresolved reasons

Use `/api/cron/settle?debug=1` to see live counts. The cron response now includes `pendingCount`, `gradedCount`, `unresolvedCount`, and `topBlockerReasons`.

## Top 10 unresolved reasons to watch

1. `espn_no_match_or_unfinished; flashscore_multisport_no_match_or_outside_date_window_basketball`
2. `espn_no_match_or_unfinished; flashscore_multisport_fetch_empty_basketball`
3. `espn_no_match_or_unfinished; flashscore_multisport_no_match_or_outside_date_window_volleyball`
4. `espn_no_match_or_unfinished; flashscore_multisport_fetch_empty_volleyball`
5. `espn_no_match_or_unfinished; flashscore_tennis_no_match_or_outside_date_window`
6. `espn_no_match_or_unfinished; flashscore_tennis_fetch_empty`
7. `espn_no_match_or_unfinished; flashscore_multisport_no_match_or_outside_date_window_hockey`
8. `espn_no_match_or_unfinished; flashscore_multisport_fetch_empty_hockey`
9. `espn_no_match_or_unfinished; flashscore_multisport_no_match_or_outside_date_window_cricket`
10. `missing_line`

## Suggested alias entries

Add these to `lib/name-matcher.ts` when they appear in live unresolved logs:

- `crvena zvezda mts` -> `red star belgrade`
- `partizan mozzart bet` -> `partizan belgrade`
- `zalgiris` -> `zalgiris kaunas`
- `bayern munchen` -> `bayern munich`
- `as monaco` -> `monaco`
- `ratiopharm ulm` -> `ulm`
- `czechia` -> `czech republic`
- `usa` -> `united states`
- `sascha zverev` -> `alexander zverev`
- Player initials such as `a zverev` -> full player name when Flashscore abbreviates first names.

