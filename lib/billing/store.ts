import { pool } from '@/lib/db'
import { ensureSubscription } from '@/lib/subscription-store'
import type { BillingUpdate } from './status'

/** What the profile needs to describe a member's billing, without calling Stripe. */
export type BillingState = {
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  paymentFailedAt: string | null
  /** A Stripe customer exists, so the portal (card, invoices, cancel) can open. */
  hasCustomer: boolean
}

export async function customerIdFor(userId: string): Promise<string | null> {
  await ensureSubscription(userId)
  const { rows } = await pool.query<{ providerCustomerId: string | null }>(
    `SELECT "providerCustomerId" FROM subscription WHERE "userId" = $1`,
    [userId],
  )
  return rows[0]?.providerCustomerId ?? null
}

export async function subscriptionIdFor(userId: string): Promise<string | null> {
  const { rows } = await pool.query<{ providerSubscriptionId: string | null }>(
    `SELECT "providerSubscriptionId" FROM subscription WHERE "userId" = $1`,
    [userId],
  )
  return rows[0]?.providerSubscriptionId ?? null
}

export async function saveCustomerId(userId: string, customerId: string): Promise<void> {
  await ensureSubscription(userId)
  await pool.query(
    `UPDATE subscription SET provider = 'stripe', "providerCustomerId" = $2, "updatedAt" = NOW() WHERE "userId" = $1`,
    [userId, customerId],
  )
}

export async function userExists(userId: string): Promise<boolean> {
  const { rowCount } = await pool.query(`SELECT 1 FROM "user" WHERE id = $1`, [userId])
  return rowCount === 1
}

export async function userIdForCustomer(customerId: string): Promise<string | null> {
  const { rows } = await pool.query<{ userId: string }>(
    `SELECT "userId" FROM subscription WHERE "providerCustomerId" = $1`,
    [customerId],
  )
  return rows[0]?.userId ?? null
}

/**
 * Writes what Stripe says into the one row access is read from. The time a
 * renewal first failed is kept across retries and cleared by the first
 * payment that goes through, so "since when" stays true.
 */
export async function applyBillingUpdate(userId: string, update: BillingUpdate): Promise<void> {
  await ensureSubscription(userId)
  await pool.query(
    `UPDATE subscription SET
        status = $2,
        "currentPeriodEnd" = $3,
        "cancelAtPeriodEnd" = $4,
        "paymentFailedAt" = CASE WHEN $5::boolean THEN COALESCE("paymentFailedAt", NOW()) ELSE NULL END,
        provider = 'stripe',
        "providerCustomerId" = $6,
        "providerSubscriptionId" = $7,
        "priceId" = $8,
        "updatedAt" = NOW()
      WHERE "userId" = $1`,
    [
      userId,
      update.status,
      update.currentPeriodEnd,
      update.cancelAtPeriodEnd,
      update.paymentFailing,
      update.providerCustomerId,
      update.providerSubscriptionId,
      update.priceId,
    ],
  )
}

/**
 * Claims a Stripe event id. True the first time, false for every redelivery,
 * so a webhook handler runs its side effects at most once per event.
 */
export async function claimEvent(id: string, type: string, userId: string | null): Promise<boolean> {
  const { rowCount } = await pool.query(
    `INSERT INTO billing_event (id, type, "userId") VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
    [id, type, userId],
  )
  return rowCount === 1
}

/** Lets a failed handler be retried: Stripe redelivers, and the claim must not block it. */
export async function releaseEvent(id: string): Promise<void> {
  await pool.query(`DELETE FROM billing_event WHERE id = $1`, [id])
}

export async function billingState(userId: string): Promise<BillingState> {
  await ensureSubscription(userId)
  const { rows } = await pool.query<{
    status: string
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd: boolean
    paymentFailedAt: Date | null
    providerCustomerId: string | null
  }>(
    `SELECT status, "currentPeriodEnd", "cancelAtPeriodEnd", "paymentFailedAt", "providerCustomerId"
       FROM subscription WHERE "userId" = $1`,
    [userId],
  )
  const row = rows[0]
  return {
    status: row?.status ?? 'free',
    currentPeriodEnd: row?.currentPeriodEnd ? row.currentPeriodEnd.toISOString() : null,
    cancelAtPeriodEnd: row?.cancelAtPeriodEnd ?? false,
    paymentFailedAt: row?.paymentFailedAt ? row.paymentFailedAt.toISOString() : null,
    hasCustomer: Boolean(row?.providerCustomerId),
  }
}
