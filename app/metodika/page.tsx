import type { Metadata } from 'next'
import Link from 'next/link'
import { ProsePage } from '@/components/landing/prose-page'
import { brand } from '@/lib/brand'
import { EVIDENCE, evidencePeriod } from '@/lib/evidence'
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
        <h2>Kodėl skaičiuojam rungtynes, o ne signalus</h2>
        <p>
          Tose pačiose rungtynėse dažnai randam kelias linijas — handikapą ir suminį, kelias sumos ribas. Tai ta pati nuomonė apie tas
          pačias rungtynes, todėl skaičiuodami kiekvieną atskirai imtį išpūstume maždaug trigubai. Kiekvienos rungtynės čia skaičiuojamos
          vieną kartą: jų signalų rezultatai suvidurkinami, o tik tada rungtynės patenka į bendrą skaičių.
        </p>
        <p>
          Paskutinė eksportuota imtis: <strong>{formatInteger(EVIDENCE.fixtures)}</strong> rungtynės su atsiskaičiusiu signalu,{' '}
          {evidencePeriod()}, vienodos sumos. Jose įvykdyti {formatInteger(EVIDENCE.signals)} signalai — tai vykdymo apimtis, o ne imties
          dydis. Vidutinis koeficientas {formatOdds(EVIDENCE.averageOdds)}.
        </p>
        <p>
          Grąža: <strong>{formatEdge(EVIDENCE.roi)}</strong>, o 95 % intervalas siekia nuo {formatEdge(EVIDENCE.roiLow)} iki{' '}
          {formatEdge(EVIDENCE.roiHigh)}. Intervalas kerta nulį, todėl sąžiningas atsakymas yra toks: per šitą laikotarpį grąžos atskirti
          nuo atsitiktinumo negalima. Uždarymo kainos matas jau kai ką rodo, grąža — dar ne.
        </p>
        <p>
          Iš {formatInteger(EVIDENCE.fixturesWithClosing)} rungtynių su užfiksuota uždarymo kaina{' '}
          <strong>{formatPercent((EVIDENCE.fixturesBeatingClose / Math.max(1, EVIDENCE.fixturesWithClosing)), 1)}</strong> pagavo geresnę
          kainą nei uždarymas; vidutinis skirtumas {EVIDENCE.clvMean === null ? '—' : formatEdge(EVIDENCE.clvMean)}, mediana{' '}
          {EVIDENCE.clvMedian === null ? '—' : formatEdge(EVIDENCE.clvMedian)}.
        </p>
        <p>
          Pagal kontoras (signalai): 7BET {formatInteger(EVIDENCE.byBook['7BET'] ?? 0)}, TopSport{' '}
          {formatInteger(EVIDENCE.byBook.TopSport ?? 0)}, Betsson {formatInteger(EVIDENCE.byBook.Betsson ?? 0)}. Skaičiuojam tik tas
          kontoras, kurias rodom viduje.
        </p>
        <p>
          Skaičiuoklė pradiniame puslapyje perleidžia kitą imtį — {formatInteger(record.bets)} atsiskaičiusių signalų (
          {record.firstDate.replaceAll('-', ' ')}–{record.lastDate.replaceAll('-', ' ')}) — nes ten simuliuojamas žmogaus kelias:
          statymai dedami po vieną, o ne rungtynėmis. Ta imtis yra vykdymo apimtis, o ne nepriklausomų stebėjimų skaičius.
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
          įrašai ir atsiskaitymų knyga. Rungtynių lygio skaičius suveda vienas scenarijus (<i>export_site_evidence.py</i>), o ne ranka
          rinkti skaičiai — todėl juos galima perskaičiuoti ir patikrinti. Prie kiekvieno skaičiaus rašom imtį ir laikotarpį, o ne vien
          procentą. Kai imtis pasipildo, perrašom skaičių, o ne paliekam patogesnį senąjį.
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
