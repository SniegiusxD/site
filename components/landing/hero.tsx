'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import Link from 'next/link'
import { LiveBoard } from './live-board'

const EASE = [0.22, 1, 0.36, 1] as const

export function Hero() {
  const reduced = useReducedMotion()
  const rise = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.9, ease: EASE, delay },
        }

  return (
    <section className="relative overflow-hidden">
      {/* Floodlight wash from above the stand: the only decorative light on the page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[42rem] bg-[radial-gradient(60%_50%_at_70%_0%,rgb(255_210_63/0.10),transparent_70%)]"
      />
      <div className="relative mx-auto grid max-w-[80rem] items-center gap-14 px-5 pt-32 pb-24 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:pt-40 lg:pb-32">
        <div className="max-w-[36rem]">
          {/* The headline is the largest paint: it renders at once, never from opacity 0. */}
          <h1 className="text-[3.6rem] sm:text-[5rem] lg:text-[5.6rem] xl:text-[6.25rem]">
            Kai kontora suklysta, tu tai matai pirmas
          </h1>
          <p className="mt-7 text-[1.15rem] leading-relaxed text-haze">
            Visą parą lyginam 7BET, TopSport ir Betsson koeficientus su Pinnacle kaina be maržos.
            Kai Lietuvos kontora už statymą moka daugiau, nei jis vertas, gauni signalą: visų
            kontorų kainas, siūlomą sumą ir statymo pavadinimą, kurį įklijuoji paieškoje.
          </p>
          <motion.div {...rise(0.22)} className="mt-10">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href="/registracija"
                className="rounded-xl bg-chalk px-6 py-4 text-[1.05rem] font-semibold text-night transition-transform duration-200 hover:bg-white active:scale-[0.97]"
              >
                Išbandyti 7 dienas nemokamai
              </Link>
              <Link
                href="/skaiciuokle"
                className="text-[1.05rem] text-chalk underline decoration-rail-strong decoration-2 underline-offset-[6px] transition-colors hover:decoration-chalk"
              >
                Pamatyk, kaip atrodo 1{' '}000 statymų
              </Link>
            </div>
            <p className="mt-4 text-[0.9rem] text-haze-dim">
              Kortelės nereikia. Po bandymo 25 € per mėnesį, atšaukti gali bet kada.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.18 }}
        >
          <LiveBoard />
        </motion.div>
      </div>
    </section>
  )
}
