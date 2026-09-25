import type { Metadata } from 'next'
import Link from 'next/link'
import { HelpView, type HelpItem } from '@/components/app/help-view'
import { FAQ_QUESTIONS } from '@/components/landing/faq'
import { brand } from '@/lib/brand'
import { GUIDES } from '@/lib/guides'

export const metadata: Metadata = {
  title: `Pagalba | ${brand.name}`,
}

const linkClass = 'text-chalk underline decoration-rail-strong underline-offset-4 hover:decoration-chalk'

/** Questions that only come up once you are inside the app. */
const APP_QUESTIONS: HelpItem[] = [
  {
    q: 'Kaip pažymėti, kad pastačiau?',
    search: 'pažymėti statymą įrašyti pastačiau sekimas statymai',
    a: (
      <>
        Signalo lange spausk „Pastačiau …“. Jei kontora davė kitą koeficientą ar sumą, spausk „Gavau kitą koeficientą arba sumą“ ir įrašyk
        tikrus skaičius; jei statymo nepriėmė, pažymėk ir tai. Visi pažymėti statymai yra{' '}
        <Link href="/statymai" className={linkClass}>
          Statymuose
        </Link>
        , ten gali pridėti pastabą ar pataisyti rezultatą.
      </>
    ),
  },
  {
    q: 'Kodėl signalas „užsidarė“?',
    search: 'užsidarė dingo signalas kaina pasikeitė vertė',
    a: 'Paskutiniame skenavime kontoros kaina nukrito arba Pinnacle kaina pakilo, ir vertės neliko. Jei jau pastatei anksčiau, statymą vis tiek gali pažymėti — jis skaičiuojamas pagal tavo gautą kainą.',
  },
  {
    q: 'Kaip gauti signalus į Telegram?',
    search: 'telegram pranešimai žinutės botas prijungti',
    a: (
      <>
        <Link href="/profilis#telegram" className={linkClass}>
          Profilyje
        </Link>{' '}
        spausk „Prijungti Telegram“ ir botui paspausk Start. Ten pat nustatai mažiausią vertę, kontoras ir tylos valandas. Telegram pranešimai
        įeina į pilną prieigą.
      </>
    ),
  },
  {
    q: 'Kaip pakeisti kontoras, bankrollą ar Kelly dalį?',
    search: 'kontoros bankrollas kelly suma limitas nustatymai keisti',
    a: (
      <>
        Viskas{' '}
        <Link href="/profilis" className={linkClass}>
          Profilyje
        </Link>
        . Kontoros limitą įrašyk ten pat: siūloma suma jo neviršys.
      </>
    ),
  },
  {
    q: 'Kas yra CLV ir kodėl jis svarbus?',
    search: 'clv closing line uždarymo kaina įrodymas',
    a: (
      <>
        CLV rodo, ar tavo gauta kaina buvo geresnė už Pinnacle kainą prieš pat rungtynes. Rezultatai svyruoja ilgai, o CLV greičiau parodo, ar
        statai tinkamu metu.{' '}
        <Link href="/metodika" className={linkClass}>
          Kaip mes matuojam
        </Link>
      </>
    ),
  },
]

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ is?: string }> }) {
  const { is } = await searchParams
  const from = typeof is === 'string' && /^\/[\w\-/]{0,80}$/.test(is) ? is : null
  const items: HelpItem[] = [...APP_QUESTIONS, ...FAQ_QUESTIONS.map((item) => ({ ...item, search: typeof item.a === 'string' ? item.a : '' }))]
  return <HelpView items={items} from={from} guides={GUIDES.map(({ slug, title, minutes }) => ({ slug, title, minutes }))} />
}
