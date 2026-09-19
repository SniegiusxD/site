import type { Metadata } from 'next'
import Link from 'next/link'
import { ProsePage } from '@/components/landing/prose-page'
import { brand } from '@/lib/brand'
import { formatEdge, formatInteger, formatOdds, formatPercent } from '@/lib/format-lt'
import { TRACK_RECORD } from '@/lib/pace'

export const metadata: Metadata = {
  title: `Kaip mes matuojam | ${brand.name}`,
  description:
    'Iš kur imam tikrąją kainą, kaip fiksuojam uždarymo kainą, kokie imties dydžiai ir laikotarpiai slepiasi už kiekvieno skaičiaus, ir ko šitie skaičiai neįrodo.',
}

// The closing-price sample, from the aggregator's CLV database (data/clv.db,
// surfaced_bets), read 2026-09-19. Same numbers as the landing page's closing
// section; change both together.
const CLOSE = { bets: 5887, beat: 0.595, mean: 0.0148, median: 0.011, from: '2026 09 05', to: '2026 09 19' }

const record = TRACK_RECORD

export default function MethodologyPage() {
  return (
    <ProsePage
      title="Kaip mes matuojam"
      updated="2026 09 19"
      notice="Šitie skaičiai yra tai, kas nutiko, o ne tai, kas nutiks. Vertė atsiperka per šimtus statymų, ir tik jei kainos iš tiesų geresnės už uždarymo."
    >
      <section>
        <h2>Iš kur imam tikrąją kainą</h2>
        <p>
          Lyginam Lietuvos kontorų koeficientus su Pinnacle. Pinnacle uždirba iš apyvartos, o ne iš maržos, todėl priima didelius
          statymus ir greitai taiso kainą — jos kaina yra artimiausias turimas įvertis, kokia tikimybė iš tikrųjų.
        </p>
        <p>
          Iš Pinnacle kainos išimam maržą (angl. <i>devigging</i>, galios metodu abiem pusėms). Likusi kaina ir yra tai, ką vadinam
          tikrąja kaina. Jei Lietuvos kontora siūlo daugiau, skirtumas yra vertė. Skenuojam maždaug kas pusvalandį; kiekvienas signalas
          rodo, kada jį pagavom.
        </p>
      </section>

      <section>
        <h2>Ką reiškia „linija interpoliuota“</h2>
        <p>
          Kartais kontora siūlo liniją, kurios Pinnacle neturi — pavyzdžiui, 5,5, kai Pinnacle kainuoja 5,0 ir 6,0. Tada tikrąją kainą
          apskaičiuojam tarp gretimų linijų ir tai pasakom prie signalo. Interpoliuota kaina yra mažiau tiksli, todėl vertė joje irgi
          mažiau tikra. Tikslaus atitikmens signalai pažymėti atskirai.
        </p>
      </section>

      <section>
        <h2>Uždarymo kaina ir CLV</h2>
        <p>
          Prieš pat rungtynes rinka žino daugiausia, ką sužinos. Tą paskutinę Pinnacle kainą be maržos fiksuojam ir lyginam su kaina,
          kurią tau rodėm. Skirtumas — CLV. Tai vienintelis matas, kurį galima patikrinti nelaukiant rezultatų, ir būtent jame
          nematomai pralaimi dauguma patarimų paslaugų.
        </p>
        <p>
          Imtis: <strong>{formatInteger(CLOSE.bets)}</strong> statymų, kuriems spėjom užfiksuoti uždarymo kainą, {CLOSE.from}–{CLOSE.to}.
          Iš jų <strong>{formatPercent(CLOSE.beat, 1)}</strong> pagavo geresnę kainą nei uždarymas. Vidurkis {formatEdge(CLOSE.mean)},
          mediana {formatEdge(CLOSE.median)}. Likusieji buvo prastesni — jie irgi suskaičiuoti.
        </p>
        <p>
          Dalies signalų uždarymo kainos užfiksuoti nespėjam (rungtynės prasideda anksčiau, nei kitas skenavimas, arba Pinnacle tą liniją
          uždaro). Tokie signalai į CLV imtį nepatenka, ir mes to neslepiam: skaičiuojam padengimą ir jį rodom.
        </p>
      </section>

      <section>
        <h2>Ką rodo mūsų pačių rezultatas</h2>
        <p>
          Atskirai skaičiuojam, kas nutiko signalams, kai rungtynės pasibaigė. Paskutinė eksportuota imtis: {formatInteger(record.bets)}{' '}
          atsiskaitę signalai, {record.firstDate.replaceAll('-', ' ')}–{record.lastDate.replaceAll('-', ' ')}, vienodos sumos.
          Grąža {formatEdge(record.roi)}, vidutinis koeficientas {formatOdds(record.averageOdds)}. Laimėta {formatInteger(record.won)},
          pralaimėta {formatInteger(record.lost)}, grąžinta {formatInteger(record.pushed)}.
        </p>
        <p>
          Pagal kontoras: 7BET {formatInteger(record.byBook['7BET'] ?? 0)}, TopSport {formatInteger(record.byBook.TopSport ?? 0)},
          Betsson {formatInteger(record.byBook.Betsson ?? 0)}. Skaičiuojam tik tas kontoras, kurias rodom viduje.
        </p>
        <p>
          Devynios dienos ir du tūkstančiai statymų yra per maža imtis pelningumui įrodyti. Tiek laiko pakanka pamatyti, ar kainos
          geresnės už uždarymo — pelnas ateina iš to, o ne atvirkščiai.
        </p>
      </section>

      <section>
        <h2>Kaip suvedami rezultatai</h2>
        <p>
          Rungtynių baigtis imam iš viešų šaltinių (SofaScore, ESPN, Flashscore), pagal tikslią rinkos sutartį: pratęsimai, kėliniai,
          setai ir kampiniai turi savo taisykles, todėl statymas niekada nevertinamas ne pagal tą rodiklį. Apie devynis iš dešimties
          atsiskaito automatiškai. Jei kuris suvestas neteisingai, gali pataisyti pats — pataisymas įrašomas į statymo istoriją ir
          pažymima, kad rezultatą nustatei tu, o ne mes.
        </p>
      </section>

      <section>
        <h2>Ko šitie skaičiai neįrodo</h2>
        <ul>
          <li>Neįrodo, kad uždirbsi. Vertė yra tikimybinis pranašumas, o ne pajamos.</li>
          <li>Neįrodo, kad tavo rezultatas bus toks pat: svarbu, kada pastatai, kokią kainą gauni ir ar kontora tau leidžia statyti.</li>
          <li>Neįrodo, kad kiekvienas signalas geras. Dalis jų uždarymo kainos neaplenkia, ir mes tai rodom.</li>
          <li>Neapima kontorų limitų: laiminčias paskyras Lietuvos kontoros karpo. Viduje gali užsirašyti savo limitus ir jų istoriją.</li>
        </ul>
      </section>

      <section>
        <h2>Iš kur šitie skaičiai</h2>
        <p>
          Visi skaičiai šiame puslapyje eksportuoti iš tos pačios duomenų bazės, kurią naudoja skeneris: signalų knyga, uždarymo kainų
          įrašai ir atsiskaitymų knyga. Prie kiekvieno skaičiaus rašom imtį ir laikotarpį, o ne vien procentą. Kai imtis pasipildo,
          perrašom skaičių, o ne paliekam patogesnį senąjį.
        </p>
        <p>
          <Link href="/#duomenys" className="text-chalk underline underline-offset-4">
            Pradiniame puslapyje
          </Link>{' '}
          tie patys duomenys suskirstyti pagal vertės dydį ir kontorą.
        </p>
      </section>
    </ProsePage>
  )
}
