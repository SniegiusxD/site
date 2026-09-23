import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
import { rateLimitResponse } from '@/lib/rate-limit'

const handlers = toNextJsHandler(auth.handler)

export const GET = handlers.GET
export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, 'auth')
  return limited ?? handlers.POST(request)
}
