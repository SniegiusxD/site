'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

/**
 * A label with the current choice, opening a small panel of options. Used for
 * the Telegram alert filters, where eight filters would otherwise fill a page.
 */
export function FilterChip({
  label,
  value,
  active,
  children,
}: {
  label: string
  /** What is chosen right now, shown on the chip. */
  value: string
  /** True when this filter narrows anything, so it reads as set. */
  active: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[0.9rem] font-medium transition-colors ${
          active ? 'bg-rail text-chalk' : 'text-haze hairline hover:text-chalk'
        }`}
      >
        <span className="sr-only">{label}: </span>
        {value}
        <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div
          id={panelId}
          className="absolute top-[calc(100%+6px)] left-0 z-30 max-h-[18rem] w-[15rem] overflow-y-auto rounded-2xl bg-stand p-2 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8),inset_0_0_0_1px_var(--rail)]"
        >
          <p className="px-2.5 pt-1.5 pb-2 text-[0.75rem] tracking-[0.06em] text-haze-dim uppercase">{label}</p>
          {children}
        </div>
      )}
    </div>
  )
}

/** One row inside a FilterChip panel. Radio for single choice, checkbox for many. */
export function FilterOption({
  label,
  checked,
  multiple = false,
  onChange,
}: {
  label: string
  checked: boolean
  multiple?: boolean
  onChange: () => void
}) {
  return (
    <button
      type="button"
      role={multiple ? 'checkbox' : 'radio'}
      aria-checked={checked}
      onClick={onChange}
      className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-2.5 text-left text-[0.9rem] transition-colors ${
        checked ? 'bg-floodlight-soft text-floodlight' : 'text-chalk hover:bg-stand-hover'
      }`}
    >
      {label}
      <span
        aria-hidden
        className={`grid size-5 shrink-0 place-items-center rounded-md ${
          checked ? 'bg-floodlight text-night' : 'shadow-[inset_0_0_0_1px_var(--rail-strong)]'
        } ${multiple ? '' : 'rounded-full'}`}
      >
        {checked && <Check className="size-3.5" strokeWidth={3} />}
      </span>
    </button>
  )
}
