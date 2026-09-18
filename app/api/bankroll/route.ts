import { NextResponse } from 'next/server'
import { listBankrollEntries, loadAccount, recordBankrollChange } from '@/lib/account-store'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })
  try {
    const [account, entries] = await Promise.all([loadAccount(user.id), listBankrollEntries(user.id)])
    return NextResponse.json({ bankroll: account.bankroll, entries })
  } catch (error) {
    console.error('[api/bankroll GET]', error)
    return NextResponse.json({ error: 'Nepavyko įkelti bankrollo.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  try {
    const result = await recordBankrollChange(user.id, body)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    const entries = await listBankrollEntries(user.id)
    return NextResponse.json({ bankroll: result.bankroll, entries })
  } catch (error) {
    console.error('[api/bankroll POST]', error)
    return NextResponse.json({ error: 'Nepavyko išsaugoti. Bandyk dar kartą.' }, { status: 500 })
  }
}
