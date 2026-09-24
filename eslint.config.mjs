import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

/**
 * Next's own rules. Generated and vendored folders are not ours to lint.
 * `pnpm lint` runs with --max-warnings=0, so a new warning fails CI; the
 * localStorage reads that used to warn go through lib/use-stored-state.ts.
 */
const config = [
  ...coreWebVitals,
  ...typescript,
  { ignores: ['.next/**', 'node_modules/**', 'public/**', 'drizzle/**', 'next-env.d.ts'] },
]

export default config
