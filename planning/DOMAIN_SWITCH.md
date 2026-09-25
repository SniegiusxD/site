# Switching the site to its own domain (valuestatymai)

Written for whoever connects the domain (owner or coder). On 2026-09-25 the
owner chose the name **valuestatymai** (DOMAIN was never registered).
`DOMAIN` below means the domain the owner buys, for example
`valuestatymai.com` (free on 09-25, $11.25/yr) or `.lt` through a Lithuanian
registrar. Buy it in Vercel → Domains if possible, so Vercel manages its DNS.

## Code: one file

`lib/brand.ts` holds every visible name (a test keeps it that way):
- `name`: the exact spelling the owner confirms (e.g. `ValueStatymai`);
- `slug`: the lowercase form, used in downloaded file names;
- `domain`: `DOMAIN`.

Internal ids stay `statyk` on purpose (billing metadata, the DDL lock,
rate-limit keys). The icon has no letter, so it stays. Also:

- `metadataBase` (share cards, canonical links, sitemap) comes from
  `VERCEL_PROJECT_PRODUCTION_URL`. Vercel sets it to the production custom
  domain once one is assigned. Redeploy after assigning it.
- Stripe checkout and portal return URLs use the request's own origin.
- Auth trusts `VERCEL_URL`, the branch URL and the production URL
  automatically.

## Settings outside the code

1. **Vercel → predictions-dashboard → Domains:** add `DOMAIN` and
   `www.DOMAIN` (redirect `www` → apex). Keep
   `predictions-dashboard-two.vercel.app`, and set it to **redirect (308) to
   `DOMAIN`**, so old links and Telegram messages keep working.
2. **Vercel env `BETTER_AUTH_URL` (Production):** if it is set to the
   `-two` address, change it to `https://DOMAIN`. Otherwise sign-in cookies
   are issued for the wrong host.
3. **Redeploy production.** Then check that `/`, `/rezultatai` and
   `/prisijungti` show `og:image` and canonical links on `https://DOMAIN`.
4. **Stripe (test and live):** in Webhooks, change the endpoint to
   `https://DOMAIN/api/billing/webhook`. The signing secret stays the same
   if the endpoint is edited, not recreated. Send a test event.
5. **VM `site-telegram` service:** set `TELEGRAM_SITE_URL=https://DOMAIN`
   in its environment file, then restart **only** `site-telegram`.
6. **GitHub `.github/workflows/monitor.yml`:** change the URL to
   `https://DOMAIN/api/health` (a pull request into `main`).
7. **Smoke** as in `RELEASE_SMOKE_AND_ROLLBACK.md`: sign up with an
   `e2e-check-…` account, sign in, open a signal, track it, then delete the
   account. Also check that a Telegram deep link opens the exact signal.

## Rollback

Remove the domain assignment in Vercel, or point it back. The `-two` address
works throughout, because nothing in the code depends on the domain.
