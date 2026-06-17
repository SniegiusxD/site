"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"
import { AppShell } from "@/components/app-shell"
import { AuthScreen } from "@/components/onboarding/auth-screen"
import { IntroFunnel, type FunnelResult } from "@/components/onboarding/intro-funnel"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { authClient } from "@/lib/auth-client"

type Stage = "intro" | "auth" | "config" | "app"

export function AppGate() {
  const { data: session, isPending } = authClient.useSession()
  const [stage, setStage] = useState<Stage>("intro")
  const [funnel, setFunnel] = useState<FunnelResult | null>(null)

  const authed = !!session?.user

  // If the session resolves to authed while sitting on the auth screen, advance.
  useEffect(() => {
    if (authed && stage === "auth") setStage("config")
  }, [authed, stage])

  function handleFunnelComplete(result: FunnelResult) {
    setFunnel(result)
    // Already-authed returning users skip straight into the app.
    setStage(authed ? "app" : "auth")
  }

  const fade = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.4, ease: "easeInOut" as const },
  }

  return (
    <AnimatePresence mode="wait">
      {stage === "intro" && (
        <motion.div key="intro" {...fade}>
          <IntroFunnel onComplete={handleFunnelComplete} />
        </motion.div>
      )}

      {stage === "auth" && (
        <motion.div key="auth" {...fade}>
          <AuthScreen
            bankroll={funnel?.bankroll}
            onAuthed={() => setStage("config")}
          />
        </motion.div>
      )}

      {stage === "config" && !isPending && (
        <motion.div key="config" {...fade}>
          <OnboardingFlow onComplete={() => setStage("app")} />
        </motion.div>
      )}

      {stage === "app" && (
        <motion.div
          key="app"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <AppShell />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
