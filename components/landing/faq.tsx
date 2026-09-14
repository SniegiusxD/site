import { Plus } from 'lucide-react'

const QUESTIONS = [
  {
    q: 'Ar tai garantuoja pelną?',
    a: 'Ne. Vertė reiškia, kad kaina tau palanki ilguoju laikotarpiu. Per trumpą laiką rezultatai svyruoja stipriai, todėl šimtai statymų svarbiau už vieną vakarą.',
  },
  {
    q: 'Kiek kontorų man reikia?',
    a: 'Pakanka vienos. Kuo daugiau paskyrų turi 7BET, TopSport ir Betsson, tuo daugiau signalų galėsi panaudoti, nes geriausia kaina vis kitoje kontoroje.',
  },
  {
    q: 'Kodėl lyginat būtent su Pinnacle?',
    a: 'Pinnacle priima didelius statymus ir neriboja laimėtojų, todėl jo kainas formuoja stipriausi rinkos dalyviai. Nuėmę maržą gaunam tikimybę, su kuria lyginam Lietuvos kontoras.',
  },
  {
    q: 'Kiek turėčiau statyti?',
    a: 'Siūlom ketvirtį Kelly kriterijaus, bet ne daugiau kaip 5 % bankrollo. Sumą visada gali pakeisti, o įrašius kontoros limitą, siūloma suma jo neviršys.',
  },
  {
    q: 'Kas nutinka, kai koeficientas pasikeičia?',
    a: 'Kai skirtumas dingsta, signalas pažymimas kaip užsidaręs. Jei ta pati kaina dar laikosi kitoje kontoroje, tai ir parodom.',
  },
  {
    q: 'Kas bus po 7 dienų?',
    a: 'Bandymas baigsis ir signalai užsirakins, kol neužsiprenumeruosi. Kortelės bandymui neprašom, todėl nieko automatiškai nenuskaičiuosim.',
  },
  {
    q: 'Ar galiu atšaukti prenumeratą?',
    a: 'Taip, bet kada profilyje. Prieiga lieka iki apmokėto mėnesio pabaigos.',
  },
  {
    q: 'Ar tai legalu?',
    a: 'Taip. Statai licencijuotose Lietuvos kontorose savo vardu. Mes statymų nepriimam ir tik parodom, kur kainos skiriasi.',
  },
]

export function Faq() {
  return (
    <section className="border-t border-rail bg-night-deep">
      <div className="mx-auto grid max-w-[80rem] gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:py-32">
        <h2 className="text-[3rem] sm:text-[4rem]">Dažni klausimai</h2>
        <div className="divide-y divide-rail border-y border-rail">
          {QUESTIONS.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[1.15rem] font-medium transition-colors hover:text-white [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus
                  className="size-5 shrink-0 text-haze transition-transform duration-300 group-open:rotate-45"
                  aria-hidden
                />
              </summary>
              <p className="max-w-[40rem] pb-6 text-haze">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
