import { AlertTriangle, ChevronDown } from 'lucide-react'

/** A section under the list that opens on demand: hidden signals, recently closed ones. */
export function Collapsible({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-t border-rail">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3.5 text-[0.95rem] text-haze hover:text-chalk sm:px-6"
      >
        {label}
        <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && children}
    </div>
  )
}

/** A warning line across the list: stale prices, the sharp source down, a failed refresh. */
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-3 border-b border-rail bg-[rgb(245_165_36/0.1)] px-4 py-3 text-[0.9rem] text-warning sm:px-6">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}
