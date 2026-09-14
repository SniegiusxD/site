'use client'

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
            onClick={() => onChange(option.value)}
            className={`rounded-full font-medium transition-colors ${chip} ${
              option.value === value ? 'bg-chalk text-night' : 'bg-rail text-haze hover:text-chalk'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
