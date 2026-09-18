'use client'

import NumberFlow from '@number-flow/react'
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/lib/use-reduced-motion'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

/** True once the element has come 12 % into the viewport; never flips back. */
export function useInViewOnce<T extends Element>(rootMargin = '0px 0px -12% 0px') {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || seen) return
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [rootMargin, seen])

  return [ref, seen] as const
}

const HIDDEN: Record<'rise' | 'scale' | 'board', string> = {
  rise: 'translateY(20px)',
  scale: 'scale(0.985)',
  board: 'translateY(28px)',
}

/** Rises or settles into place the first time it scrolls into view. */
export function Reveal({
  variant = 'rise',
  delay = 0,
  className,
  children,
}: {
  variant?: 'rise' | 'scale' | 'board'
  delay?: number
  className?: string
  children: React.ReactNode
}) {
  const [ref, seen] = useInViewOnce<HTMLDivElement>()
  const reduced = useReducedMotion()
  const hidden = !seen && !reduced
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: hidden ? 0 : 1,
        transform: hidden ? HIDDEN[variant] : 'none',
        transition: `opacity 600ms ${EASE} ${delay}ms, transform 600ms ${EASE} ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

/** A number that rolls up from zero when it first scrolls into view. */
export function Roll({
  value,
  decimals = 0,
  signed = false,
  prefix,
  suffix,
  className,
}: {
  value: number
  decimals?: number
  signed?: boolean
  prefix?: string
  suffix?: string
  className?: string
}) {
  const [ref, seen] = useInViewOnce<HTMLSpanElement>()
  return (
    <span ref={ref} className={className}>
      <NumberFlow
        value={seen ? value : 0}
        locales="lt-LT"
        prefix={prefix}
        suffix={suffix}
        format={{
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
          signDisplay: signed ? 'exceptZero' : 'auto',
        }}
      />
    </span>
  )
}

/** A row of single-choice pills (radio semantics) for dark or light sections. */
export function Pills<T extends string | number>({
  label,
  options,
  value,
  onChange,
  tone = 'dark',
  hideLabel = false,
}: {
  label: string
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  tone?: 'dark' | 'light'
  hideLabel?: boolean
}) {
  const track = tone === 'dark' ? 'bg-night' : 'bg-ink/[0.06]'
  const on = tone === 'dark' ? 'bg-chalk text-night' : 'bg-ink text-cream'
  const off = tone === 'dark' ? 'text-haze hover:text-chalk' : 'text-moss hover:text-ink'
  return (
    <fieldset className="min-w-0">
      <legend className={hideLabel ? 'sr-only' : `mb-2.5 text-[0.875rem] font-semibold ${tone === 'dark' ? 'text-chalk' : 'text-ink'}`}>
        {label}
      </legend>
      <div role="radiogroup" className={`inline-flex max-w-full flex-wrap gap-1.5 rounded-full p-1 ${track}`}>
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={`min-h-11 rounded-full px-[18px] text-[0.9375rem] font-semibold transition-colors duration-150 ${active ? on : off}`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
