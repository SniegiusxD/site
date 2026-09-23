import { NextResponse } from 'next/server'
import { exportAccount } from '@/lib/account-data'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** A copy of everything stored about the signed-in member, as a JSON file. */
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })
  try {
    const data = await exportAccount(user.id)
    const day = new Date().toISOString().slice(0, 10)
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="statyk-duomenys-${day}.json"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[api/account/export]', error)
    return NextResponse.json({ error: 'Nepavyko paruošti duomenų.' }, { status: 500 })
  }
}
