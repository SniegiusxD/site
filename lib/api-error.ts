import type { ApiError } from '@/lib/use-api'

/**
 * One sentence for a failed request, in the site's voice: what went wrong and
 * what the member can do. `what` names the thing that did not load, in the
 * genitive ("statymų", "kainos istorijos").
 */

export type ErrorAdvice = {
  message: string
  /** Signed out elsewhere: the way back is signing in, not retrying. */
  signIn: boolean
  /** Whether a retry button makes sense right now. */
  retry: boolean
}

/** "30 s", "2 min", "1 val." — how long the server asked us to wait, rounded up. */
export function waitLabel(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.ceil(seconds))} s`
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.ceil(minutes / 60)} val.`
}

export function errorAdvice(error: Pick<ApiError, 'status' | 'retryAfter' | 'serverMessage'>, what: string): ErrorAdvice {
  if (error.status === 0) {
    return { message: `Nepavyko įkelti ${what}: nėra ryšio su serveriu. Patikrink internetą ir bandyk dar kartą.`, signIn: false, retry: true }
  }
  if (error.status === 401) {
    return { message: 'Tavo sesija baigėsi arba atsijungei kitame lange. Prisijunk iš naujo.', signIn: true, retry: false }
  }
  if (error.status === 429) {
    const wait = error.retryAfter !== null ? ` Bandyk po ${waitLabel(error.retryAfter)}.` : ' Palauk minutę ir bandyk dar kartą.'
    return { message: `Per daug užklausų per trumpą laiką.${wait}`, signIn: false, retry: true }
  }
  if (error.status >= 500) {
    return { message: `Nepavyko įkelti ${what}. Serveris laikinai neatsako, bandyk dar kartą.`, signIn: false, retry: true }
  }
  return { message: error.serverMessage ?? `Nepavyko įkelti ${what}.`, signIn: false, retry: error.status !== 403 && error.status !== 402 }
}
