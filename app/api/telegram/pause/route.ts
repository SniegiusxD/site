import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { loadTelegramState, pauseTelegram, resumeTelegram } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

const CHOICES = ['hour', 'tomorrow', 'forever', 'resume'] as const
type Choice = (typeof CHOICES)[number]

const vilnius = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Vilnius',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** Tomorrow means 8 in the morning in Vilnius, not a round number of hours. */
export function nextMorning(now: Date): Date {
  const parts = vilnius.formatToParts(now)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  const minutesNow = hour * 60 + minute
  const minutesUntil = minutesNow < 8 * 60 ? 8 * 60 - minutesNow : 32 * 60 - minutesNow
  return new Date(now.getTime() + minutesUntil * 60_000)
}

/** Stop alerts for a while, or start them again. */
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const choice = body.until as Choice
  if (!CHOICES.includes(choice)) return NextResponse.json({ error: 'Nežinoma pauzė.' }, { status: 400 })

  try {
    if (choice === 'resume') await resumeTelegram(user.id)
    else if (choice === 'hour') await pauseTelegram(user.id, new Date(Date.now() + 3600_000))
    else if (choice === 'tomorrow') await pauseTelegram(user.id, nextMorning(new Date()))
    // No end: the member turns them back on themselves.
    else await pauseTelegram(user.id, null)
    return NextResponse.json(await loadTelegramState(user.id))
  } catch (error) {
    console.error('[api/telegram/pause]', error)
    return NextResponse.json({ error: 'Nepavyko pakeisti pranešimų.' }, { status: 500 })
  }
}
