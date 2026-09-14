const QUESTIONS = [
  {
    q: 'Ar tai garantuoja pelną?',
    a: 'Ne. Vertė reiškia, kad kaina tau palanki ilguoju laikotarpiu. Per trumpą laiką rezultatai svyruoja stipriai, todėl šimtai statymų svarbiau už vieną vakarą.',
  },
  {
    q: 'Kiek kontorų man reikia?',
    a: 'Pakanka vienos. Kuo daugiau paskyrų turi 7BET, TopSport ir Betsson, tuo daugiau signalų galėsi panaudoti, nes kaina geriausia vis kitoje kontoroje.',
  },
  {
    q: 'Kodėl lyginat būtent su Pinnacle?',
    a: 'Pinnacle priima didelius statymus ir retai riboja lošėjus, todėl jo kainas formuoja stipriausi rinkos dalyviai. Nuėmę maržą gaunam tikimybę, su kuria lyginam Lietuvos kontoras.',
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
    q: 'Ar tai legalu?',
    a: 'Taip. Statai licencijuotose Lietuvos kontorose savo vardu. Mes tik parodom, kur kainos skiriasi.',
  },
]

export function Faq() {
  return (
    <section className="border-t border-line">
      <div className="mx-auto grid max-w-[76rem] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_2fr] lg:py-28">
        <h2 className="text-[2.75rem] sm:text-[3.5rem]">Dažni klausimai</h2>
        <div className="border-t border-ink">
          {QUESTIONS.map((item) => (
            <details key={item.q} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[1.1rem] font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="font-display text-3xl leading-none transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="max-w-[40rem] pb-6 text-mist">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
