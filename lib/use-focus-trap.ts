'use client'

import { type RefObject, useEffect, useRef } from 'react'

/**
 * What a modal dialog owes a keyboard user: focus moves into it when it
 * opens, Tab and Shift+Tab stay inside it, Escape closes it, and focus goes
 * back to whatever opened it. The container should have tabIndex={-1} so it
 * can take focus itself when it holds nothing focusable.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Where Tab should go instead of the browser's choice, or null to let it be.
 * `index` is the focused element's place among the dialog's focusables (-1
 * when focus is outside it).
 */
export function trapTarget(index: number, count: number, backwards: boolean): number | null {
  if (count === 0) return null
  if (index === -1) return backwards ? count - 1 : 0
  if (backwards && index === 0) return count - 1
  if (!backwards && index === count - 1) return 0
  return null
}

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onClose: () => void,
  initialFocus?: RefObject<HTMLElement | null>,
) {
  // The latest onClose without re-running the trap (and re-focusing) when it changes.
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })

  useEffect(() => {
    if (!active) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusables = () =>
      [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((element) => element.getClientRects().length > 0)

    // After the dialog has mounted and painted its first frame.
    const frame = window.requestAnimationFrame(() => {
      const box = ref.current
      if (!box || box.contains(document.activeElement)) return
      ;(initialFocus?.current ?? focusables()[0] ?? box).focus({ preventScroll: true })
    })

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusables()
      const target = trapTarget(items.indexOf(document.activeElement as HTMLElement), items.length, event.shiftKey)
      if (target === null) return
      event.preventDefault()
      items[target].focus()
    }
    document.addEventListener('keydown', onKey)

    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey)
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [active, ref, initialFocus])
}
