import { betterAuth } from 'better-auth'
import { username } from 'better-auth/plugins'
import { pool } from '@/lib/db'
import { ensureSubscription } from '@/lib/subscription-store'

const productionUrl =
  process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined

const vercelOrigins = [
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
  process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
].filter((origin): origin is string => Boolean(origin))

// `next dev` (3000) and `next start` (3100) on a local machine only.
const localOrigins = process.env.VERCEL ? [] : ['http://localhost:3000', 'http://localhost:3100']

export const auth = betterAuth({
  database: pool,
  // Production pins its own URL; previews and local runs derive it from the request.
  baseURL: process.env.BETTER_AUTH_URL ?? productionUrl,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  // June accounts signed up with a username and a placeholder email; they
  // still sign in by username.
  plugins: [username()],
  trustedOrigins: [
    ...vercelOrigins,
    ...localOrigins,
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await ensureSubscription(user.id)
          } catch (error) {
            // Not fatal: getAccess() creates the free row on first load.
            console.error('[auth] could not create the subscription row', error)
          }
        },
      },
    },
  },
})
