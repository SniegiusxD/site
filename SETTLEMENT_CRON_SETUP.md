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

## 4. Still pending on friend (#39)

ITF/Challenger tennis and obscure soccer leagues aren't on ESPN. When the friend
delivers a LiveScore/Flashscore **results** scraper, add it as a second source in
the grader chain (ESPN → friend results → neisspresta). See
`SCRAPER_HANDOFF_FOR_FRIEND.md` § Type C in the backend repo.

## Security

- `/api/cron/settle` requires `Authorization: Bearer <CRON_SECRET>`; wrong/missing → 401.
- Keep `CRON_SECRET` **server-only** (Vercel env) — never in client code or git.
