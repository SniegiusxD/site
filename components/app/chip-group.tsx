'use client'

import { useState } from 'react'

/** A single-choice row of chips (radio semantics). */
export function ChipGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  size = 'sm',
}: {
  label: string
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
}) {
  // Only the chip the member just picked pops, not the one chosen on load.
  const [picked, setPicked] = useState<T | null>(null)
  const chip = size === 'md' ? 'px-4 py-2 text-[0.95rem]' : 'px-3 py-1.5 text-[0.9rem]'
  return (
    <fieldset>
      <legend className={size === 'md' ? 'font-medium' : 'text-[0.85rem] text-haze'}>{label}</legend>
      <div role="radiogroup" className="mt-2 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            onClick={() => {
              setPicked(option.value)
              onChange(option.value)
            }}
            className={`rounded-full font-medium transition-colors ${chip} ${
              option.value === value
                ? `${option.value === picked ? 'animate-[kr-chip-pop_260ms_cubic-bezier(0.22,1,0.36,1)] ' : ''}bg-chalk text-night` : 'bg-rail text-haze hover:text-chalk'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
