// Vercel restores .next/cache from the previous deployment before every build.
// On 2026-09-24 Turbopack reused a stale compile of app/globals.css from that
// cache: new Tailwind utilities shipped, but every keyframe and rule changed in
// globals.css did not (production kept the old animations and the old LCP).
// The build takes ~10 s to compile from scratch, so correctness wins: start
// every build from an empty cache.
import { rmSync } from 'node:fs'

rmSync('.next/cache', { recursive: true, force: true })
console.log('[build] cleared .next/cache')
