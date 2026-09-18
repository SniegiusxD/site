import Link from 'next/link'
import { formatEdge, formatInteger } from '@/lib/format-lt'
import { TRACK_RECORD, recordPeriodLabel } from '@/lib/pace'
import { simulate } from '@/lib/simulate'
import { FaqList } from './faq-list'
import { Reveal } from './motion-primitives'

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
        scenarijų po 1 000 statymų baigiasi minuse. Todėl rodom ir CLV: jis parodo, ar kainos buvo geros, net kai rezultatas dar svyruoja.{' '}
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
        pusvalandis. Kiek laiko užtruks 1 000 statymų, pamatysi{' '}
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
    a: 'Kontoras ir Pinnacle skenuojam maždaug kas 40 minučių (vienas ciklas trunka apie 25 minutes). Naujas signalas atsiranda programėlėje ir Telegram iškart po skenavimo. Kainos kartais pasikeičia greičiau, todėl prieš statydamas patikrink koeficientą kontoroje.',
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
    q: 'Ką gaunu nemokamai?',
    a: 'Tikrus signalus iki 2 % vertės ir iki 2,50 koeficiento, kartu su bankrollu ir statymų sekimu. Didesnės vertės signalai matomi kaip užrakinti: matai, kiek jų yra ir kokia vertė, bet ne rungtynes. Juos atrakina 7 dienų bandymas arba prenumerata.',
  },
  {
    q: 'Ar galiu atšaukti prenumeratą?',
    a: 'Taip, bet kada profilyje. Prieiga lieka iki apmokėto mėnesio pabaigos, o paskui grįžti į nemokamą paskyrą — bankrollas ir statymai lieka vietoje.',
  },
  {
    q: 'Ar tai legalu?',
    a: 'Taip. Statai licencijuotose Lietuvos kontorose savo vardu. Mes statymų nepriimam ir tik parodom, kur kainos skiriasi.',
  },
]

export function Faq() {
  return (
    <section className="bg-night-alt px-5 py-[clamp(80px,10vw,160px)] sm:px-8">
      <div className="mx-auto max-w-[60rem]">
        <Reveal>
          <h2 className="mb-[clamp(32px,4vw,56px)] text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[0.95]">Dažni klausimai</h2>
        </Reveal>
        <FaqList items={QUESTIONS} />
      </div>
    </section>
  )
}
