# Site release: how it ships, how it is checked, how it is undone

Written for whoever releases the website (Claude, the coder AI or the owner).
Board item t35.

## 1. How a change reaches production

Normal path: push to `main`. Vercel's GitHub integration builds it and promotes
it to production — `https://predictions-dashboard-two.vercel.app`. There is no
own domain yet. `predictions-dashboard.vercel.app` (without `-two`) belongs to
someone else and must never be used.

**The integration has dropped twice** (mid-September, and again after
2026-09-19 11:00 UTC). When it drops, pushes still succeed and CI still goes
green, but nothing deploys — and nothing says so. Check after every release:

```bash
npx vercel ls predictions-dashboard      # the newest Production row must be minutes old
```

If it is not, first ask GitHub what Vercel said about the commit — a failed
build that never becomes a deployment does not show in `vercel ls` at all:

```bash
gh api repos/SniegiusxD/site/commits/<sha>/statuses --jq '.[] | .context + " " + .state + " " + .target_url'
```

**2026-09-24: this was the real cause of the "dropped integration".** Every
push since 09-19 got `Vercel failure` linking to the cron pricing page: the
project is on the Hobby plan, which allows a cron at most once a day, and
`vercel.json` had `/api/cron/settle` every 15 minutes. Vercel refused every
build. The Vercel cron is now daily (04:00 UTC) as a fallback; the 15-minute
schedule belongs on the VM (a timer calling the endpoint with `CRON_SECRET`).
Never put a sub-daily schedule in `vercel.json` on this plan.

Only if GitHub shows no Vercel status at all is the integration disconnected:
Vercel → project → Settings → Git → reconnect the GitHub repository. Until then, a manual deploy has to come from a **clean
checkout of `origin/main`**, never from the working folder, which holds
untracked files that are not meant to ship:

```bash
git fetch origin
git worktree add --detach ../deploy-main origin/main
cp .vercel/project.json ../deploy-main/.vercel/project.json   # mkdir .vercel first
cd ../deploy-main && npx vercel deploy --prod --yes
cd - && git worktree remove --force ../deploy-main
```

## 2. Before a release

CI runs these on every push to `main` (`.github/workflows/checks.yml`): types,
lint (0 errors), unit tests, a production build, and the browser suite — 7
public pages at 1440 px and on a phone, one h1, no sideways scroll, every
resource loads, axe clean. A green run takes about two minutes. A job that runs
longer than 15 minutes is stopped; if it is the browser job, look for a server
that did not shut down, not for a failing test.

## 3. After a release: the smoke

One new member walks the whole product on the deployment itself, then deletes
their own account:

```bash
E2E_ORIGIN=https://predictions-dashboard-two.vercel.app \
  node --env-file=.env.local --experimental-strip-types tests/e2e/release-smoke.manual.ts
```

It checks, in order: public pages answer; sign-up; the board is closed until
onboarding is finished; onboarding; the free board; the trial starts once and
only once and opens the full board; a signal opens from a deep link; a real
live signal is recorded as a bet; a note, tags and a hand-corrected result are
kept, with three rows of edit history; the tracker renders; a Telegram link can
be issued; billing answers (a Checkout session is created but never paid, or
"billing off" where no key is set); the data export; deletion, after which the
old session answers 401. The exit code is the number of failed steps. If a step
fails, its account is still removed from the database.

Two deeper checks run against Stripe **test** mode only, locally:

- `tests/e2e/billing-checkout.manual.ts` — pays with 4242 on the real Checkout
  page, confirms the subscription on return, cancels at period end, opens the
  portal, and deletes its Stripe customer afterwards.
- `tests/e2e/account-data.manual.ts` — a member with a bet, edits, a limit and
  a live subscription exports their data (no secrets in it), and deletion
  cancels the subscription in Stripe and leaves no row behind.

Both refuse to run with a live key.

## 3a. Stale CSS from the build cache

**2026-09-24:** a deploy restored `.next/cache` from the previous deployment and
Turbopack reused its old compile of `app/globals.css`: new Tailwind utilities
shipped, but every rule and keyframe changed in `globals.css` did not. The
build now clears `.next/cache` first (`scripts/clear-build-cache.mjs`, ~10 s
extra). If a styling change is ever missing live, compare the deployed CSS
(`curl` the `/_next/static/…css` files linked from the page) with a local
build before suspecting the code.

## 3b. Errors after a release

Every browser crash a visitor sees is posted to `/api/client-error` and
logged as one `[client-error]` JSON line (message, top of the stack, page
path, release, browser; extension and network noise dropped). Every server
error is logged as `[server-error]` by `instrumentation.ts`. After a release,
and whenever something seems off:

```bash
npx vercel logs <deployment-url> --since 1h | grep -E "client-error|server-error"
```

The Hobby plan keeps those logs for **one hour only**. Both kinds are also
stored in the `error_event` table (grouped: one row per distinct error with a
count and first/last time, kept 30 days), and the owner page
`/savininkas` lists the 20 most recent under **Klaidos** with their release.
That list is the place to look after a release, even hours later.

A new error that names the new release is a reason to roll back (below).

## 3c. Health monitor

`/api/health` answers 200 when the database responds and the scanner published
within 90 minutes, 503 otherwise (`problem`: `stale`, `no-status`,
`database`, or `results-stale`).

`results-stale` means no result has reached `signal_result` for 24 hours even
though matches we published 6–48 hours ago have finished. That is how the
grader froze from 09-19 to 09-25 without anyone noticing. Check the VM's
`settlement_output/summary.json` (`progress_health`) and the `[SITE OUTCOMES]`
log lines. `.github/workflows/monitor.yml` calls it at :07 and :37 every hour
from GitHub, with three tries a minute apart; a failed run makes GitHub email
the repository owner. It only runs from the default branch, so it starts
working once it is on `main`. Run it by hand from the Actions tab
(workflow_dispatch) after a release.

## 4. Rollback

**Code.** Vercel keeps every deployment. Promote the previous good one:

```bash
npx vercel ls predictions-dashboard                  # find the last good Production URL
npx vercel promote <that deployment URL>
```

or Vercel → Deployments → ⋯ → Promote to Production. It takes seconds and
needs no rebuild.

**Database.** Every schema change on the site is additive
(`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, in
`lib/db/ensure-*.ts`), so an older deployment runs against the newer schema
unchanged. Nothing is dropped on rollback. Never restore a Neon branch to undo a
code release — only for demonstrated data corruption.

**Billing.** Removing `STRIPE_SECRET_KEY` from the environment turns billing off
at once: the site shows "Mokėjimai įjungiami netrukus" and every billing route
answers 503. Existing subscriptions keep running in Stripe and keep their
access in our database; nothing is cancelled by turning the site's side off.

## 5. Switching billing on for real

In this order — each line is a condition for the next:

1. Legal pages carry the real company name, address, contact, refund and
   complaints terms (board t31). They are still marked "Juodraštis".
2. Decide on Stripe **Managed Payments**. It is on by default on this account:
   Stripe sells as merchant of record ("Parduota per Link") and handles EU VAT,
   for an extra fee. Keeping it needs nothing more; turning it off means VAT is
   ours to handle (Stripe Tax or an accountant).
3. In Stripe (live mode): Developers → Webhooks → add endpoint
   `https://predictions-dashboard-two.vercel.app/api/billing/webhook` with the
   events `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `customer.subscription.paused`, `customer.subscription.resumed`,
   `invoice.paid`, `invoice.payment_failed`. Copy its signing secret.
4. Vercel → Settings → Environment Variables, **Production** only:
   `STRIPE_SECRET_KEY` (`sk_live_…`), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   (`pk_live_…`), `STRIPE_WEBHOOK_SECRET` (`whsec_…`). Preview and Development
   keep the test pair. Redeploy.
5. The price and the customer-portal configuration are created on first use in
   live mode (`statyk_all_signals_monthly_eur`, 25 € a month, VAT inclusive).
6. Pay once with a real card, check the profile shows the subscription, cancel
   it from the portal, and refund yourself in the Stripe dashboard.
