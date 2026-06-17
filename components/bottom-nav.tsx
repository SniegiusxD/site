"use client"

import { NAV_ITEMS, type SectionKey } from "@/lib/nav"
import { usePortfolio } from "@/lib/portfolio-store"
import { cn } from "@/lib/utils"

export function BottomNav({
  section,
  onChange,
}: {
  section: SectionKey
  onChange: (s: SectionKey) => void
}) {
  const { pendingCount } = usePortfolio()

  return (
    <nav
      aria-label="Pagrindinė navigacija"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md"
    >
      <div className="mx-auto grid max-w-3xl grid-cols-5 px-2 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const active = key === section
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="relative">
                <Icon className="size-5" aria-hidden="true" />
                {key === "aktyvus" && pendingCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-semibold text-primary-foreground">
                    {pendingCount}
                  </span>
                )}
              </span>
              {label}
              {active && (
                <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
