import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { getAccess, startTrial } from '@/lib/subscription-store'

export const dynamic = 'force-dynamic'

/** Starts the 7 free days. Once only: a used trial returns the current access. */
export async function POST() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  try {
    const started = await startTrial(user.id)
    return NextResponse.json({ started, access: await getAccess(user.id) })
  } catch (error) {
    console.error('[api/trial]', error)
    return NextResponse.json({ error: 'Nepavyko pradėti bandymo. Bandyk dar kartą.' }, { status: 500 })
  }
}
