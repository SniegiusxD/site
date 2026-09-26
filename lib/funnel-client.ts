/**
 * Browser half of lib/onboarding-funnel.ts: the step names, and a
 * fire-and-forget report of the step a browser reached. The id is random and
 * lives in this browser only; it is never the account id.
 */

/** The steps of components/app/onboarding-flow.tsx, then "finished". */
export const FUNNEL_STEPS = [
  'Prieš pradedant',
  'Bankrollas',
  'Kontoros',
  'Signalai',
  'Rizika',
  'Tempas',
  'Pranešimai',
  'Baigė',
] as const

export const FINISHED_STEP = FUNNEL_STEPS.length - 1

const KEY = 'funnel-visitor'
let memoryId: string | null = null

function newId(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function visitorId(): string {
  try {
    const stored = window.localStorage.getItem(KEY)
    if (stored) return stored
    const id = newId()
    window.localStorage.setItem(KEY, id)
    return id
  } catch {
    // Storage refused (private mode): one id for this page view is still useful.
    memoryId ??= newId()
    return memoryId
  }
}

export function reportFunnelStep(step: number): void {
  try {
    void fetch('/api/onboarding/step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor: visitorId(), step }),
      keepalive: true,
    }).catch(() => undefined)
  } catch {
    // Measuring must never get in the member's way.
  }
}
