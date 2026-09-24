/**
 * Server errors in one searchable shape: `vercel logs … | grep server-error`.
 * Next calls this for every error thrown while rendering a page or running a
 * route handler; its default logging still happens as well.
 */
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  const err = error as Error & { digest?: string }
  console.error(
    '[server-error]',
    JSON.stringify({
      message: String(err?.message ?? error).slice(0, 500),
      digest: err?.digest ?? null,
      route: context.routePath,
      type: context.routeType,
      method: request.method,
      // Without the query string: queries can carry tokens.
      path: request.path.split('?')[0].slice(0, 120),
      release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
    }),
  )
}
