import {
  pgTable,
  text,
  timestamp,
  boolean,
  doublePrecision,
} from 'drizzle-orm/pg-core'

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
})
