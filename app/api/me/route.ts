import { NextResponse } from 'next/server'
import { loadAccount } from '@/lib/account-store'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })
  try {
    const account = await loadAccount(user.id)
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email }, ...account })
  } catch (error) {
    console.error('[api/me]', error)
    return NextResponse.json({ error: 'Nepavyko įkelti paskyros. Bandyk dar kartą.' }, { status: 500 })
  }
}
