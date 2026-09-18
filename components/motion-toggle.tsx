'use client'

import { setMotionMode, useMotionMode } from '@/lib/use-reduced-motion'

/** For anyone who wants the page to hold still. Animations are on by default. */
export function MotionToggle() {
  const mode = useMotionMode()
  const calm = mode === 'calm'
  return (
    <button
      type="button"
      aria-pressed={calm}
      onClick={() => setMotionMode(calm ? 'full' : 'calm')}
      className="inline-flex min-h-11 items-center gap-2 text-left transition-colors hover:text-chalk"
    >
      <span
        aria-hidden
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${calm ? 'bg-rail' : 'bg-floodlight'}`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-night transition-[left] duration-200 ${calm ? 'left-0.5' : 'left-[1.125rem]'}`}
        />
      </span>
      Animacijos
    </button>
  )
}
