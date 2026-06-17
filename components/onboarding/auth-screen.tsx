"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Loader2, Lock, User, Wallet } from "lucide-react"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { eur0 } from "@/lib/format"

type Props = {
  onAuthed: () => void
  bankroll?: number
}

export function AuthScreen({ onAuthed, bankroll }: Props) {
  const reduce = useReducedMotion()
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-up")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === "sign-up"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const uname = username.trim()
    if (uname.length < 3) {
      setError("Vartotojo vardas turi būti bent 3 simbolių.")
      return
    }
    if (password.length < 8) {
      setError("Slaptažodis turi būti bent 8 simbolių.")
      return
    }

    setLoading(true)
    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({
          // Better Auth requires an email; we synthesize one from the username.
          email: `${uname.toLowerCase()}@signalai.local`,
          password,
          name: uname,
          username: uname,
        })
        if (error) {
          setError(translateError(error.message))
          return
        }
      } else {
        const { error } = await authClient.signIn.username({
          username: uname,
          password,
        })
        if (error) {
          setError(translateError(error.message))
          return
        }
      }
      onAuthed()
    } catch {
      setError("Įvyko klaida. Bandyk dar kartą.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 text-foreground">
      <BackdropGlow />

      <motion.div
        initial={{ opacity: 0, y: reduce ? 0 : 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            {isSignUp ? (
              <>
                Atidaryk platformą.
                <br />
                <span className="text-primary">Klaidos gyvai.</span>
              </>
            ) : (
              "Sveikas sugrįžęs"
            )}
          </h1>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
            {isSignUp
              ? "Pasirink vartotojo vardą ir slaptažodį — el. pašto nereikia."
              : "Prisijunk su vartotojo vardu ir slaptažodžiu."}
          </p>
          {isSignUp && bankroll != null && (
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
              <Wallet className="size-4" aria-hidden="true" />
              Tavo bankas: {eur0(bankroll)}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field
            icon={<User className="size-4" aria-hidden="true" />}
            label="Vartotojo vardas"
          >
            <input
              type="text"
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="tavo_vardas"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
              aria-label="Vartotojo vardas"
            />
          </Field>

          <Field
            icon={<Lock className="size-4" aria-hidden="true" />}
            label="Slaptažodis"
          >
            <input
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
              aria-label="Slaptažodis"
            />
          </Field>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </motion.p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="mt-2 w-full gap-2 font-semibold"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <>
                {isSignUp ? "Sukurti paskyrą" : "Prisijungti"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignUp ? "Jau turi paskyrą?" : "Neturi paskyros?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(isSignUp ? "sign-in" : "sign-up")
              setError(null)
            }}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {isSignUp ? "Prisijunk" : "Registruokis"}
          </button>
        </p>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Be kortelės · 18+ · Žaisk atsakingai.
        </p>
      </motion.div>
    </div>
  )
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 focus-within:border-primary">
        <span className="text-muted-foreground">{icon}</span>
        {children}
      </span>
    </label>
  )
}

function translateError(message?: string) {
  if (!message) return "Įvyko klaida. Bandyk dar kartą."
  const m = message.toLowerCase()
  if (m.includes("invalid") || m.includes("password") || m.includes("credential"))
    return "Neteisingas vartotojo vardas arba slaptažodis."
  if (m.includes("exist") || m.includes("taken") || m.includes("unique"))
    return "Toks vartotojo vardas jau užimtas."
  return "Įvyko klaida. Bandyk dar kartą."
}

function BackdropGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute -left-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -right-24 bottom-0 size-72 rounded-full bg-success/10 blur-3xl" />
    </div>
  )
}
