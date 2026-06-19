"use client"

import { Activity, RefreshCw, User } from "lucide-react"
import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth-client"
import { displayUsername } from "@/lib/display-user"
import { NAV_ITEMS, type SectionKey } from "@/lib/nav"

export function TopBar({ section }: { section: SectionKey }) {
  const title = NAV_ITEMS.find((n) => n.key === section)?.label ?? "Signalai"
  const [updated, setUpdated] = useState(0)
  const { data: session } = authClient.useSession()
  const userLabel = session?.user ? displayUsername(session.user) : null

  // simulate auto-refresh cadence (every 30s)
  useEffect(() => {
    const id = setInterval(() => setUpdated((n) => (n + 1) % 30), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold tracking-tight">{title}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {userLabel ? `@${userLabel}` : "SportsBetting AI"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {userLabel && (
            <span
              className="hidden items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground sm:flex"
              title={`Prisijungta: ${userLabel}`}
            >
              <User className="size-3" aria-hidden="true" />
              <span className="max-w-[88px] truncate">{userLabel}</span>
            </span>
          )}
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
      </div>
    </header>
  )
}
