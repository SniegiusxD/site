'use client'

import { motion } from 'framer-motion'
import { useId } from 'react'
import { SPRING } from '@/lib/motion'

/** A compact single-choice switch (radio semantics) for periods and sorting. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  size = 'md',
}: {
  label: string
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  /** 'sm' fits beside the icon buttons of a page header. */
  size?: 'sm' | 'md'
}) {
  // The chosen option's background slides across instead of jumping (calm
  // mode makes it a plain swap through MotionConfig).
  const group = useId()
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-stand p-1 hairline">
      {options.map((option) => {
        const on = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.value)}
            className={`relative rounded-lg font-medium transition-colors ${size === 'sm' ? 'px-2.5 py-1 text-[0.85rem]' : 'px-3.5 py-1.5 text-[0.95rem]'} ${on ? 'text-night' : 'text-haze hover:text-chalk'}`}
          >
            {on && <motion.span layoutId={`segmented-${group}`} aria-hidden className="absolute inset-0 rounded-lg bg-chalk" transition={SPRING.snappy} />}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
