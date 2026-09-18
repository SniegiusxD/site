import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

/** Next's own rules. Generated and vendored folders are not ours to lint. */
export default [
  ...coreWebVitals,
  ...typescript,
  { ignores: ['.next/**', 'node_modules/**', 'public/**', 'drizzle/**', 'next-env.d.ts'] },
]
