import Stripe from 'stripe'
import { PRICE_EUR_PER_MONTH } from '@/lib/subscription'

/**
 * The Stripe side of billing. Import it only from route handlers and server
 * components: the secret key is not a NEXT_PUBLIC_ variable, so even an
 * accidental client import would see no key rather than leak one.
 *
 * When no key is configured (a preview, CI, or production before billing is
 * switched on) every caller gets `null` and says so, rather than failing half
 * way through a checkout.
 */

/** Stable handle for the one plan, so the price is found rather than duplicated. */
export const PRICE_LOOKUP_KEY = 'statyk_all_signals_monthly_eur'

/**
 * Stripe's tax category for the product: "General — Electronically Supplied
 * Services". Required while Managed Payments (Stripe as merchant of record,
 * handling EU VAT) is on, which is this account's default; harmless if it is
 * later turned off.
 */
export const PRODUCT_TAX_CODE = 'txcd_10000000'

let client: Stripe | null | undefined

export function stripe(): Stripe | null {
  if (client !== undefined) return client
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  client = key ? new Stripe(key) : null
  return client
}

export const billingEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY?.trim())

/** True when the configured key only moves test money. */
export const testMode = () => process.env.STRIPE_SECRET_KEY?.trim().startsWith('sk_test_') ?? false

let priceCache: string | null = null

/**
 * The monthly price, created on first use if this Stripe account does not have
 * it yet. Found by lookup key, so a second deployment reuses the first one's
 * price instead of creating a parallel product.
 */
export async function monthlyPriceId(api: Stripe): Promise<string> {
  if (priceCache) return priceCache
  const found = await api.prices.list({ lookup_keys: [PRICE_LOOKUP_KEY], active: true, limit: 1, expand: ['data.product'] })
  const existing = found.data[0]
  if (existing) {
    // A product created before the tax code was known gets it now, once.
    const product = existing.product as { id: string; tax_code?: string | { id: string } | null }
    if (!product.tax_code) await api.products.update(product.id, { tax_code: PRODUCT_TAX_CODE })
    priceCache = existing.id
    return priceCache
  }
  const product = await api.products.create({
    name: 'Statyk — visi signalai',
    description: 'Visi vertės signalai, Telegram pranešimai ir statymų sekimas.',
    tax_code: PRODUCT_TAX_CODE,
  })
  const price = await api.prices.create({
    product: product.id,
    currency: 'eur',
    unit_amount: PRICE_EUR_PER_MONTH * 100,
    recurring: { interval: 'month' },
    lookup_key: PRICE_LOOKUP_KEY,
    tax_behavior: 'inclusive',
  })
  priceCache = price.id
  return priceCache
}

let portalCache: string | null = null

/**
 * A customer-portal configuration that lets a member cancel at the end of the
 * period (never immediately — they paid for the month), change their card,
 * and download invoices. Created once and reused, found by its metadata tag.
 */
export async function portalConfigurationId(api: Stripe): Promise<string> {
  if (portalCache) return portalCache
  const existing = await api.billingPortal.configurations.list({ active: true, limit: 20 })
  const ours = existing.data.find((config) => config.metadata?.app === 'statyk')
  if (ours) {
    portalCache = ours.id
    return portalCache
  }
  const created = await api.billingPortal.configurations.create({
    business_profile: { headline: 'Statyk prenumerata' },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ['email', 'address', 'tax_id'] },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        cancellation_reason: {
          enabled: true,
          options: ['too_expensive', 'unused', 'missing_features', 'switched_service', 'other'],
        },
      },
    },
    metadata: { app: 'statyk' },
  })
  portalCache = created.id
  return portalCache
}
