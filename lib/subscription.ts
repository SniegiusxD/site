export const TRIAL_DAYS = 7
export const PRICE_EUR_PER_MONTH = 25

const DAY_MS = 24 * 60 * 60 * 1000

export type SubscriptionStatus = 'trialing' | 'active' | 'canceled' | 'expired'

export type SubscriptionRow = {
  status: SubscriptionStatus
  trialEndsAt: Date | string
  currentPeriodEnd: Date | string | null
}

export type Access = {
  /** What the account is right now, after applying the clock. */
  state: 'trial' | 'active' | 'ending' | 'expired'
  hasAccess: boolean
  /** When access ends: trial end or paid period end. Null for open-ended active plans. */
  endsAt: string | null
  /** Whole days left, rounded up; 0 once access has ended. */
  daysLeft: number
}

export function trialEndFrom(start: Date): Date {
  return new Date(start.getTime() + TRIAL_DAYS * DAY_MS)
}

/**
 * Pure access decision. `canceled` keeps access until the paid period ends;
 * `trialing` keeps access until the trial ends. Everything else is expired.
 */
export function accessFrom(row: SubscriptionRow, now: Date = new Date()): Access {
  const trialEnd = new Date(row.trialEndsAt)
  const periodEnd = row.currentPeriodEnd ? new Date(row.currentPeriodEnd) : null
  const daysUntil = (end: Date) => Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY_MS))

  if (row.status === 'active') {
    if (!periodEnd || periodEnd > now) {
      return { state: 'active', hasAccess: true, endsAt: periodEnd?.toISOString() ?? null, daysLeft: periodEnd ? daysUntil(periodEnd) : 0 }
    }
  }
  if (row.status === 'canceled' && periodEnd && periodEnd > now) {
    return { state: 'ending', hasAccess: true, endsAt: periodEnd.toISOString(), daysLeft: daysUntil(periodEnd) }
  }
  if (row.status === 'trialing' && trialEnd > now) {
    return { state: 'trial', hasAccess: true, endsAt: trialEnd.toISOString(), daysLeft: daysUntil(trialEnd) }
  }
  const ended = periodEnd && periodEnd > trialEnd ? periodEnd : trialEnd
  return { state: 'expired', hasAccess: false, endsAt: ended.toISOString(), daysLeft: 0 }
}
