export const TRIAL_DAYS = 7
export const PRICE_EUR_PER_MONTH = 25

const DAY_MS = 24 * 60 * 60 * 1000

export type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'canceled' | 'expired'

export type SubscriptionRow = {
  status: SubscriptionStatus
  /** Null until the trial is started. */
  trialEndsAt: Date | string | null
  /** Set the moment the trial starts, so it can only be taken once. */
  trialStartedAt: Date | string | null
  currentPeriodEnd: Date | string | null
  /** Owner-granted full access. Independent of Stripe and never changes billing. */
  adminAccessUntil?: Date | string | null
}

/** What an account may see. 'free' is the limited board, 'full' is everything. */
export type AccessTier = 'free' | 'full'

export type Access = {
  /** What the account is right now, after applying the clock. */
  state: 'free' | 'trial' | 'active' | 'ending' | 'expired'
  tier: AccessTier
  /** True for the full board. Free accounts keep a limited one. */
  hasAccess: boolean
  /** The 7 days are still untouched. */
  canStartTrial: boolean
  /** When access ends: trial end or paid period end. Null for free and open-ended plans. */
  endsAt: string | null
  /** Whole days left, rounded up; 0 once access has ended. */
  daysLeft: number
}

export function trialEndFrom(start: Date): Date {
  return new Date(start.getTime() + TRIAL_DAYS * DAY_MS)
}

/**
 * Pure access decision. `canceled` keeps full access until the paid period
 * ends; `trialing` until the trial ends. Everything else falls back to the free
 * tier rather than a locked door: an account without a subscription still sees
 * the small signals (lib/free-tier.ts).
 */
export function accessFrom(row: SubscriptionRow, now: Date = new Date()): Access {
  const trialEnd = row.trialEndsAt ? new Date(row.trialEndsAt) : null
  const periodEnd = row.currentPeriodEnd ? new Date(row.currentPeriodEnd) : null
  const adminEnd = row.adminAccessUntil ? new Date(row.adminAccessUntil) : null
  const daysUntil = (end: Date) => Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY_MS))
  const full = (state: Access['state'], endsAt: Date | null) => ({
    state,
    tier: 'full' as const,
    hasAccess: true,
    canStartTrial: false,
    endsAt: endsAt?.toISOString() ?? null,
    daysLeft: endsAt ? daysUntil(endsAt) : 0,
  })

  const later = (left: Date, right: Date | null) => right && right > left ? right : left
  if (row.status === 'active' && (!periodEnd || periodEnd > now)) {
    return full('active', periodEnd ? later(periodEnd, adminEnd) : null)
  }
  if (row.status === 'canceled' && periodEnd && periodEnd > now) {
    return adminEnd && adminEnd > periodEnd ? full('active', adminEnd) : full('ending', periodEnd)
  }
  if (row.status === 'trialing' && trialEnd && trialEnd > now) {
    return adminEnd && adminEnd > trialEnd ? full('active', adminEnd) : full('trial', trialEnd)
  }
  if (adminEnd && adminEnd > now) return full('active', adminEnd)

  const used = Boolean(row.trialStartedAt ?? trialEnd)
  const ended = periodEnd && trialEnd && periodEnd > trialEnd ? periodEnd : (trialEnd ?? periodEnd)
  return {
    state: used ? 'expired' : 'free',
    tier: 'free',
    hasAccess: false,
    canStartTrial: !used,
    endsAt: used ? (ended?.toISOString() ?? null) : null,
    daysLeft: 0,
  }
}
