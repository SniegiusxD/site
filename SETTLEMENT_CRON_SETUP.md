# Backend Settlement Cron (#40) — Setup

The site grades bets server-side via a protected endpoint. A VPS cron calls it
every 10–15 min, so customers never self-report results and no paid API is used.

## 1. Vercel env var

Set a shared secret on the site (Vercel → Project → Settings → Environment Variables):

```
CRON_SECRET=<long-random-string>
```

Generate one (PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Redeploy after saving (Production + Preview if you test on preview URLs).

## 2. VPS cron (every 15 min)

On the VPS (`95.179.153.249`), add to crontab (`crontab -e`):

```cron
*/15 * * * * curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET_HERE" https://predictions-dashboard-two.vercel.app/api/cron/settle >> /var/log/bet-settle.log 2>&1
```

- Replace `YOUR_CRON_SECRET_HERE` with the **same** value as Vercel `CRON_SECRET`.
- Log file: `/var/log/bet-settle.log` (create if needed: `touch /var/log/bet-settle.log`).

**Test once manually (from VPS or your PC):**

```bash
curl -s -H "Authorization: Bearer YOUR_CRON_SECRET_HERE" https://predictions-dashboard-two.vercel.app/api/cron/settle
```

Expected JSON:

```json
{ "ok": true, "scanned": 19, "graded": 0, "unresolved": 0, "stillPending": 19, "unresolvedBets": [] }
```

## 3. What it does

- Grades every pending `user_bet` row (all logged-in users) from ESPN public scores.
- Markets: moneyline (all ESPN sports), spread/total (team sports), BTTS (football).
- Tennis game spread/total: when `#33b` is merged (ESPN `linescores`).
- Rows **>24h** past kickoff with no resolvable score → status `neisspresta`
  (Neišspręsta) + `console.warn` in Vercel logs. Customers never grade these by hand.
- `neisspresta` counts as void (stake back, profit 0) in ROI analytics.

## 4. Tennis results (#39 — Flashscore)

ITF/Challenger tennis isn't on ESPN. The VPS runs `run_flashscore_results.py` every
15 min and writes `odds_output/tennis_results.json`. The site grader tries ESPN first,
then `GET /api/tennis-results` on the VPS.

**VPS cron (add alongside odds-runner):**

```cron
*/15 * * * * cd /opt/odds-bot && ./venv/bin/python run_flashscore_results.py --once >> /var/log/flashscore-results.log 2>&1
```

**Optional Vercel env:** `TENNIS_RESULTS_URL=http://95.179.153.249:5001/api/tennis-results`
(default if unset — same as opportunities API host).

**Flashscore token:** set `FLASHSCORE_FSIGN` on VPS if `SW9D1eZo` starts returning 403.

## 5. Multisport results (Phase 4 — Flashscore volleyball/basketball/hockey/cricket)

Volleyball, obscure (non-NBA) basketball, ice hockey and cricket aren't reliably
on ESPN. The VPS runs `run_flashscore_multisport.py` every 15 min and writes
`odds_output/multisport_results.json`. The site grader tries ESPN first, then
`GET /api/multisport-results` on the VPS.

**VPS cron:**

```cron
*/15 * * * * cd /opt/odds-bot && ./venv/bin/python run_flashscore_multisport.py --once >> /var/log/flashscore-multisport.log 2>&1
```

**Optional Vercel env:** `MULTISPORT_RESULTS_URL=http://95.179.153.249:5001/api/multisport-results`
(default if unset). Reuses `FLASHSCORE_FSIGN` on VPS.

Coverage: volleyball (ML = sets won; total = combined set points if line saved),
basketball/ice_hockey (ML/spread/total from final score), cricket (ML winner only).

## 6. MLB player props (Phase 5/7 — ESPN box scores)

MLB player props (hits, HR, total bases, RBIs, strikeouts) settle from ESPN
box-score stats. The VPS runs `run_mlb_boxscore.py` every 30 min and writes
`odds_output/mlb_player_stats.json`. The site grader fetches `GET /api/mlb-stats`.

**VPS cron:**

```cron
*/30 * * * * cd /opt/odds-bot && ./venv/bin/python run_mlb_boxscore.py --once >> /var/log/mlb-boxscore.log 2>&1
```

**Optional Vercel env:** `MLB_STATS_URL=http://95.179.153.249:5001/api/mlb-stats`
(default if unset).

## 7. Full VPS crontab reference

```cron
*/5  * * * * cd /opt/odds-bot && ./venv/bin/python odds_runner.py --once >> /var/log/odds-runner.log 2>&1
*/15 * * * * cd /opt/odds-bot && ./venv/bin/python run_flashscore_results.py --once >> /var/log/flashscore-results.log 2>&1
*/15 * * * * cd /opt/odds-bot && ./venv/bin/python run_flashscore_multisport.py --once >> /var/log/flashscore-multisport.log 2>&1
*/30 * * * * cd /opt/odds-bot && ./venv/bin/python run_mlb_boxscore.py --once >> /var/log/mlb-boxscore.log 2>&1
*/15 * * * * curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET_HERE" https://predictions-dashboard-two.vercel.app/api/cron/settle >> /var/log/bet-settle.log 2>&1
```

**Debug blocker reasons:** add `?debug=1` to the settle URL to see why bets stay
pending (e.g. `missing_line`, `no_multisport_match`, `mlb_stats_fetch_empty`,
`prop_missing_player_name`, `cricket_line_unsupported`).

## Security

- `/api/cron/settle` requires `Authorization: Bearer <CRON_SECRET>`; wrong/missing → 401.
- Keep `CRON_SECRET` **server-only** (Vercel env) — never in client code or git.
