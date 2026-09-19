import { boolean, doublePrecision, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  // Added by the Better Auth `username` plugin.
  username: text('username').unique(),
  displayUsername: text('displayUsername'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- User betting (#10) ----------------------------------------------------

export const userSettings = pgTable('user_settings', {
  userId: text('userId')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  baseBankroll: doublePrecision('baseBankroll').notNull().default(500),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const userBet = pgTable('user_bet', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  signalId: text('signalId'),
  sport: text('sport').notNull(),
  match: text('match').notNull(),
  betDescription: text('betDescription').notNull(),
  bookmaker: text('bookmaker').notNull(),
  odds: doublePrecision('odds').notNull(),
  stake: doublePrecision('stake').notNull(),
  marketType: text('marketType').notNull().default('moneyline'),
  pickName: text('pickName'),
  line: doublePrecision('line'),
  homeName: text('homeName'),
  awayName: text('awayName'),
  gameKey: text('gameKey'),
  startsAt: timestamp('startsAt', { withTimezone: true }),
  status: text('status').notNull().default('laukia'),
  profit: doublePrecision('profit'),
  placedAt: timestamp('placedAt', { withTimezone: true }).notNull().defaultNow(),
  settledAt: timestamp('settledAt', { withTimezone: true }),
  entryFairProb: doublePrecision('entryFairProb'),
  eventKey: text('eventKey'),
  closingFairProb: doublePrecision('closingFairProb'),
  closingCapturedAt: timestamp('closingCapturedAt', { withTimezone: true }),
  shownOdds: doublePrecision('shownOdds'),
  shownStake: doublePrecision('shownStake'),
  /** 'accepted' | 'limited' | 'rejected': what the bookmaker did with it. */
  placement: text('placement').notNull().default('accepted'),
  /** Seconds between the price capture we showed and the bet being recorded. */
  delaySeconds: integer('delaySeconds'),
  /** The member's own note about this bet. */
  note: text('note'),
  canonicalOutcome: text('canonicalOutcome'),
  resultSource: text('resultSource'),
  homeScore: integer('homeScore'),
  awayScore: integer('awayScore'),
})

/** A correction a member made to a recorded bet. Append-only. */
export const betEdit = pgTable('bet_edit', {
  id: text('id').primaryKey(),
  betId: text('betId').notNull(),
  userId: text('userId').notNull(),
  /** 'odds' | 'stake' | 'note' | 'deleted' */
  field: text('field').notNull(),
  fromValue: text('fromValue'),
  toValue: text('toValue'),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
})
