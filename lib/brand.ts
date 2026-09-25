/**
 * The brand in one place; lib/__tests__/brand-in-one-place.test.ts keeps it so.
 * Named Statyk on 2026-09-18. On 2026-09-25 the owner chose valuestatymai; the
 * rename waits for the exact spelling and the domain (statyk.me was never
 * registered). Change it here and nowhere else.
 */
export const brand = {
  name: 'Statyk',
  /** Lowercase, for file names people download. Internal ids (billing metadata, locks, rate-limit keys) stay 'statyk'. */
  slug: 'statyk',
  /** Not registered yet; null until the owner buys the valuestatymai domain. */
  domain: null as string | null,
  description:
    'Lyginam Lietuvos kontorų koeficientus su tarptautinės rinkos kaina ir parodom, kur kaina aukštesnė už rinkos įvertinimą.',
} as const
