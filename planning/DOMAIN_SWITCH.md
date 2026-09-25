# Switching the site to statyk.me

Written for whoever connects the domain (owner or coder). On 2026-09-25
`statyk.me` was **not registered**. Buy it first (Vercel → Domains, $13.99/yr),
so that its DNS is managed by Vercel.

## Code: nothing to change

- `metadataBase` (share cards, canonical links, sitemap) comes from
  `VERCEL_PROJECT_PRODUCTION_URL`. Vercel sets it to the production custom
  domain once one is assigned. Redeploy after assigning it.
- Stripe checkout and portal return URLs use the request's own origin.
- Auth trusts `VERCEL_URL`, the branch URL and the production URL
  automatically.

## Settings outside the code

1. **Vercel → predictions-dashboard → Domains:** add `statyk.me` and
   `www.statyk.me` (redirect `www` → apex). Keep
   `predictions-dashboard-two.vercel.app`, and set it to **redirect (308) to
   `statyk.me`**, so old links and Telegram messages keep working.
2. **Vercel env `BETTER_AUTH_URL` (Production):** if it is set to the
   `-two` address, change it to `https://statyk.me`. Otherwise sign-in cookies
   are issued for the wrong host.
3. **Redeploy production.** Then check that `/`, `/rezultatai` and
   `/prisijungti` show `og:image` and canonical links on `https://statyk.me`.
4. **Stripe (test and live):** in Webhooks, change the endpoint to
   `https://statyk.me/api/billing/webhook`. The signing secret stays the same
   if the endpoint is edited, not recreated. Send a test event.
5. **VM `site-telegram` service:** set `TELEGRAM_SITE_URL=https://statyk.me`
   in its environment file, then restart **only** `site-telegram`.
6. **GitHub `.github/workflows/monitor.yml`:** change the URL to
   `https://statyk.me/api/health` (a pull request into `main`).
7. **Smoke** as in `RELEASE_SMOKE_AND_ROLLBACK.md`: sign up with an
   `e2e-check-…` account, sign in, open a signal, track it, then delete the
   account. Also check that a Telegram deep link opens the exact signal.

## Rollback

Remove the domain assignment in Vercel, or point it back. The `-two` address
works throughout, because nothing in the code depends on the domain.
