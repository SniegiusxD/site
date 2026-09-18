'use client'

/** A compact single-choice switch (radio semantics) for periods and sorting. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
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
            className={`rounded-lg px-3.5 py-1.5 text-[0.95rem] font-medium transition-colors ${on ? 'bg-chalk text-night' : 'text-haze hover:text-chalk'}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
