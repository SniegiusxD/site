import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

/** Next's own rules. Generated and vendored folders are not ours to lint. */
export default [
  ...coreWebVitals,
  ...typescript,
  { ignores: ['.next/**', 'node_modules/**', 'public/**', 'drizzle/**', 'next-env.d.ts'] },
  {
    // The React Compiler rules landed on an app that was written before them
    // and currently report 20 places, all in components that work. They stay
    // on as warnings so new code is still told about them, and CI can gate on
    // everything else instead of staying permanently red. Clearing them is
    // tracked in planning/SITE_COMPETITIVE_UX_ARCHITECTURE_AUDIT_2026-09-18.md.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
]
