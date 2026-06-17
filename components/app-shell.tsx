"use client"

import { useState } from "react"
import { BottomNav } from "@/components/bottom-nav"
import { KpiStrip } from "@/components/kpi-strip"
import { AktyvusSection } from "@/components/sections/aktyvus-section"
import { AnalitikaSection } from "@/components/sections/analitika-section"
import { IstorijaSection } from "@/components/sections/istorija-section"
import { NustatymaiSection } from "@/components/sections/nustatymai-section"
import { SignalaiSection } from "@/components/sections/signalai-section"
import { TopBar } from "@/components/top-bar"
import type { SectionKey } from "@/lib/nav"
import { PortfolioProvider } from "@/lib/portfolio-store"

export function AppShell() {
  const [section, setSection] = useState<SectionKey>("signalai")

  return (
    <PortfolioProvider>
      <div className="min-h-screen">
        <TopBar section={section} />

        <main className="mx-auto max-w-3xl px-4 pb-28 pt-4">
          <KpiStrip />

          <div className="mt-5">
            {section === "signalai" && <SignalaiSection />}
            {section === "aktyvus" && <AktyvusSection />}
            {section === "istorija" && <IstorijaSection />}
            {section === "analitika" && <AnalitikaSection />}
            {section === "nustatymai" && <NustatymaiSection />}
          </div>
        </main>

        <BottomNav section={section} onChange={setSection} />
      </div>
    </PortfolioProvider>
  )
}
