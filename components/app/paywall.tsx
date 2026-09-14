import { Check } from 'lucide-react'
import type { Access } from '@/lib/subscription'
import { PRICE_EUR_PER_MONTH, TRIAL_DAYS } from '@/lib/subscription'

export function Paywall({ access }: { access: Access }) {
  return (
    <main className="mx-auto flex min-h-[80dvh] max-w-[36rem] flex-col justify-center px-5 py-16 sm:px-8">
      <h1 className="text-[2.8rem] sm:text-[3.6rem]">
        {access.state === 'expired' ? `Tavo ${TRIAL_DAYS} dienų bandymas baigėsi` : 'Prieiga baigėsi'}
      </h1>
      <p className="mt-4 text-haze">
        Tavo nustatymai, bankrollas ir pažymėti statymai išsaugoti. Užsiprenumeravus viskas bus ten,
        kur palikai.
      </p>
      <div className="lift mt-10 rounded-3xl bg-stand p-7">
        <p className="flex items-baseline gap-2">
          <span className="font-display text-6xl font-extrabold tnum">{PRICE_EUR_PER_MONTH} €</span>
          <span className="text-haze">per mėnesį</span>
        </p>
        <ul className="mt-6 space-y-2.5">
          {['Visi signalai su visų kontorų kainomis', 'Statymų sekimas ir rezultatai', 'Atšaukti gali bet kada'].map((item) => (
            <li key={item} className="flex gap-3">
              <Check className="mt-1 size-5 shrink-0 text-pitch" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled
          className="mt-8 h-12 w-full cursor-not-allowed rounded-xl bg-chalk/60 font-semibold text-night"
        >
          Mokėjimai įjungiami netrukus
        </button>
      </div>
    </main>
  )
}
