import { Plus } from 'lucide-react'
import Link from 'next/link'
import { formatEdge, formatInteger } from '@/lib/format-lt'
import { TRACK_RECORD, recordPeriodLabel } from '@/lib/pace'
import { simulate } from '@/lib/simulate'

// The same resampled history as the calculator: how many 1,000-bet runs end below zero.
const negativeInTen = Math.round(
  simulate({ returns: TRACK_RECORD.returns, stake: 1, bets: 1000, paths: 400, seed: 5, points: 4 }).shareNegative * 10,
)

const linkClass = 'text-chalk underline decoration-rail-strong underline-offset-4 hover:decoration-chalk'

const QUESTIONS: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: 'Ar tikrai uždirbsiu?',
    a: (
      <>
        Pažadėti to niekas negali. Mūsų {formatInteger(TRACK_RECORD.bets)} užbaigtų signalų ({recordPeriodLabel()}) grąža kol kas{' '}
        {formatEdge(TRACK_RECORD.roi)}, o istorija dar trumpa. Skaičiuoklėje, kuri naudoja tuos pačius rezultatus, maždaug {negativeInTen} iš 10
        scenarijų po 1 000 statymų baigiasi minuse. Todėl rodom ir CLV: jis parodo, ar kainos buvo geros, net kai rezultatas dar svyruoja.{' '}
        <Link href="/skaiciuokle" className={linkClass}>
          Skaičiuoklė
        </Link>
      </>
    ),
  },
  {
    q: 'Kiek laiko tam reikia per dieną?',
    a: (
      <>
        Vienam statymui apie 3 minutės: atidarai signalą, nukopijuoji pavadinimą, pastatai ir pažymi. Dešimt statymų per dieną yra maždaug
        pusvalandis. Kiek laiko užtruks 1 000 statymų, pamatysi{' '}
        <Link href="/skaiciuokle" className={linkClass}>
          skaičiuoklėje
        </Link>
        .
      </>
    ),
  },
  {
    q: 'Kiek kontorų man reikia?',
    a: 'Pakanka vienos. Kuo daugiau paskyrų turi 7BET, TopSport ir Betsson, tuo daugiau signalų galėsi panaudoti, nes geriausia kaina vis kitoje kontoroje.',
  },
  {
    q: 'Kaip greitai ateina signalai?',
    a: 'Kontoras ir Pinnacle skenuojam maždaug kas pusvalandį. Naujas signalas atsiranda programėlėje ir Telegram iškart po skenavimo. Kainos kartais pasikeičia greičiau, todėl prieš statydamas patikrink koeficientą kontoroje.',
  },
  {
    q: 'Ką daryti, jei kontora mane jau apribojo?',
    a: 'Paprašyk kontoros raštu nurodyti taisyklių punktą, pagal kurį tave apribojo. Jei tokio punkto nėra, gali kreiptis į Lošimų priežiūros tarnybą: teismas 2025 ir 2026 m. patvirtino baudas kontoroms už savavališką ribojimą. Kol kas statyk kitose kontorose, o profilyje įrašyk tikrą limitą, kad siūloma suma jo neviršytų.',
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
