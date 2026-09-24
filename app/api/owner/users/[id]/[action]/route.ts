import { NextResponse } from 'next/server'
import { applyOwnerMutation, OwnerMutationError, parseOwnerMutation } from '@/lib/admin-actions'
import { isOwner } from '@/lib/owner'
import { rateLimitResponse } from '@/lib/rate-limit'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string; action: string }> }

/** Owner-only, audited grant/extend/revoke endpoint. Non-owners always see 404. */
export async function POST(request: Request, context: Context) {
  const user = await getSessionUser()
  if (!user || !isOwner(user.email)) return NextResponse.json({ error: 'Nerasta.' }, { status: 404 })
  const limited = await rateLimitResponse(request, 'expensive-action')
  if (limited) return limited

  const { id, action } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ error: 'Netinkamas narys.' }, { status: 400 })
  const parsed = parseOwnerMutation(action, await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: 'Netinkami veiksmo duomenys.', field: parsed.error }, { status: 400 })

  try {
    return NextResponse.json(await applyOwnerMutation(id, user.email, parsed.value))
  } catch (error) {
    if (error instanceof OwnerMutationError) {
      if (error.code === 'not_found') return NextResponse.json({ error: 'Narys nerastas.' }, { status: 404 })
      return NextResponse.json({ error: 'Mokamos prenumeratos bandymo pratęsti negalima.' }, { status: 409 })
    }
    console.error('[api/owner/users/action]', error)
    return NextResponse.json({ error: 'Nepavyko pakeisti prieigos.' }, { status: 500 })
  }
}
