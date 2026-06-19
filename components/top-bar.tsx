"use client"

import { Activity, LogIn, LogOut, RefreshCw, User } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { useAuthUi } from "@/lib/auth-ui-context"
import { displayUsername } from "@/lib/display-user"
import { NAV_ITEMS, type SectionKey } from "@/lib/nav"

export function TopBar({ section }: { section: SectionKey }) {
  const title = NAV_ITEMS.find((n) => n.key === section)?.label ?? "Signalai"
  const [updated, setUpdated] = useState(0)
  const [signingOut, setSigningOut] = useState(false)
  const { openSignIn } = useAuthUi()
  const { data: session, isPending } = authClient.useSession()
  const userLabel = session?.user ? displayUsername(session.user) : null

  useEffect(() => {
    const id = setInterval(() => setUpdated((n) => (n + 1) % 30), 1000)
    return () => clearInterval(id)
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await authClient.signOut()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold tracking-tight">{title}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {isPending
                ? "Kraunama…"
                : userLabel
                  ? `@${userLabel}`
                  : "Svečias · neprisijungta"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isPending ? null : userLabel ? (
            <>
              <span
                className="flex max-w-[96px] items-center gap-1 truncate rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary"
                title={`Prisijungta: ${userLabel}`}
              >
                <User className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{userLabel}</span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 px-2 text-[11px]"
                disabled={signingOut}
                onClick={() => void handleSignOut()}
                aria-label="Atsijungti"
              >
                <LogOut className="size-3.5" aria-hidden="true" />
                Išeiti
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-8 gap-1 px-2.5 text-[11px] font-semibold"
              onClick={openSignIn}
            >
              <LogIn className="size-3.5" aria-hidden="true" />
              Prisijungti
            </Button>
          )}

          <div className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-2 py-1.5 sm:flex">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">Live</span>
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
