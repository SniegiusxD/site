"use client"

import { Activity, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import { NAV_ITEMS, type SectionKey } from "@/lib/nav"

export function TopBar({ section }: { section: SectionKey }) {
  const title = NAV_ITEMS.find((n) => n.key === section)?.label ?? "Signalai"
  const [updated, setUpdated] = useState(0)

  // simulate auto-refresh cadence (every 30s)
  useEffect(() => {
    const id = setInterval(() => setUpdated((n) => (n + 1) % 30), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-4.5" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">{title}</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              SportsBetting AI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            Tiesiogiai
          </span>
          <RefreshCw
            className="size-3 text-muted-foreground"
            style={{ animation: updated === 0 ? "spin 1s linear" : undefined }}
            aria-hidden="true"
          />
        </div>
      </div>
    </header>
  )
}
