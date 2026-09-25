'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import { useReducedMotion } from '@/lib/use-reduced-motion'

type TransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void>) => { finished: Promise<void> }
}

/**
 * Moving between the app's sections slides the main column in the direction of
 * the nav (styles in app/globals.css, `app-main`). It uses the View Transitions
 * API; browsers without it, and calm mode, just navigate.
 *
 * The browser snapshots the old page, waits for the promise, then snapshots the
 * new one. The promise resolves once the new pathname has been committed.
 */
export function useNavTransition(order: string[]) {
  const router = useRouter()
  const pathname = usePathname()
  const reduced = useReducedMotion()
  const settle = useRef<(() => void) | null>(null)

  useEffect(() => {
    settle.current?.()
    settle.current = null
  }, [pathname])

  return useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      const doc = document as TransitionDocument
      const target = href.split('?')[0]
      if (
        reduced ||
        !doc.startViewTransition ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0 ||
        pathname.startsWith(target)
      ) {
        return
      }
      event.preventDefault()
      const from = order.findIndex((item) => pathname.startsWith(item))
      const to = order.indexOf(target)
      document.documentElement.dataset.navDir = to < from ? 'back' : 'forward'
      const transition = doc.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            settle.current = resolve
            // A slow page must not freeze the screen: the browser gives up at
            // about 4 s anyway, this lets the snapshot go sooner.
            setTimeout(resolve, 1500)
            router.push(href)
          }),
      )
      transition.finished.finally(() => delete document.documentElement.dataset.navDir)
    },
    [order, pathname, reduced, router],
  )
}
