import type { Metadata } from 'next'
import Link from 'next/link'
import { DemoSignal } from '@/components/landing/demo-signal'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'
import { brand } from '@/lib/brand'

export const metadata: Metadata = {
  title: `Kaip atrodo signalas | ${brand.name}`,
  description: 'Tikras užfiksuotas signalas: visų kontorų kainos, tikroji kaina be Pinnacle maržos ir siūloma suma.',
}

export default function DemoPage() {
  return (
    <>
      <SiteHeader />
      <main className="pt-10 pb-8">
        <div className="mx-auto max-w-[46rem] px-5 sm:px-8">
          <h1 className="text-[clamp(2.2rem,4.5vw,3.4rem)] leading-[0.98]">Taip atrodo signalas iš vidaus</h1>
          <p className="mt-4 text-[clamp(1.05rem,1.4vw,1.2rem)] text-haze">
            Paspaudinėk: čia tikri signalai iš vieno mūsų skenavimo, su visomis kontorų kainomis, tikrąja kaina ir suma. Registruotis
            nereikia.
          </p>
          <Link
            href="/registracija"
            className="mt-6 inline-flex min-h-11 items-center rounded-[14px] bg-floodlight px-5 font-semibold text-night transition-transform duration-150 hover:-translate-y-0.5"
          >
            Sukurti nemokamą paskyrą
          </Link>
        </div>
        <div className="mt-8">
          <DemoSignal />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
