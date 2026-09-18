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

// The v0 preview serves the dev server through one of these hostnames
// depending on how it's being viewed. Only these exact v0-provided origins
// are trusted — never a wildcard or the raw request origin.
const v0Origins = [
  process.env.V0_RUNTIME_URL,
  process.env.V0_DEV_APP_URL,
  process.env.V0_BUILD_URL,
  process.env.V0_SANDBOX_URL,
].filter((origin): origin is string => Boolean(origin))

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
    ...v0Origins,
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  ...(process.env.NODE_ENV === 'development'
    ? {
        advanced: {
          // Required by the cross-site v0 preview iframe. Without these
          // attributes, login succeeds but the next request appears signed out.
          defaultCookieAttributes: {
            sameSite: 'none' as const,
            secure: true,
          },
        },
      }
    : {}),
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
