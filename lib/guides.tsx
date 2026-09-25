import Link from 'next/link'

/**
 * Plain-language guides for the questions people actually search for in
 * Lithuanian. They explain the method honestly, promise no profit, and point
 * to the calculator and the methodology rather than to a sales pitch.
 */

export type Guide = {
  slug: string
  title: string
  /** One sentence for search results and link previews. */
  description: string
  updated: string
  /** ISO date for structured data. */
  updatedIso: string
  minutes: number
  body: React.ReactNode
}

const link = 'text-chalk underline decoration-rail-strong underline-offset-4 hover:decoration-chalk'

export const GUIDES: Guide[] = [
  {
    slug: 'kas-yra-vertes-statymai',
    title: 'Kas yra vertės statymai (value betting)',
    description:
      'Vertės statymas — kai kontora siūlo didesnį koeficientą, nei rodo tikroji tikimybė. Kaip tai atpažinti, kodėl tam reikia šimtų statymų ir ko tai negarantuoja.',
    updated: '2026 m. rugsėjo 24 d.',
    updatedIso: '2026-09-24',
    minutes: 5,
    body: (
      <>
        <section>
          <h2>Trumpai</h2>
          <p>
            Kiekvienas koeficientas yra kaina. Koeficientas 2,00 reiškia, kad kontora laiko baigtį maždaug 50 % tikėtina, o dar
            prideda savo maržą. Vertės statymas yra toks, kurio kaina geresnė už tikrąją tikimybę: jei baigtis iš tikrųjų įvyksta 50 %
            atvejų, o kontora moka 2,10, ilgainiui tokie statymai atsiperka.
          </p>
          <p>Tai ne spėjimas, kas laimės. Tai kainų palyginimas.</p>
        </section>
        <section>
          <h2>Iš kur žinoti tikrąją tikimybę</h2>
          <p>
            Tiksliai jos nežino niekas, bet yra geras įvertis: didžiųjų, laimėtojų neribojančių kontorų kaina. Labiausiai žinoma yra
            Pinnacle. Ji priima didelius statymus iš stipriausių lošėjų, todėl jos kaina greitai prisitaiko prie visko, ką rinka
            sužino. Nuėmus maržą, gaunama „tikroji kaina“.
          </p>
          <p>
            Pavyzdžiui, Pinnacle abiem baigtims siūlo 1,95 ir 1,95. Be maržos tai 50 % ir 50 %, tikroji kaina 2,00. Jei Lietuvos kontora
            tą pačią baigtį siūlo už 2,10, jos kaina 5 % didesnė nei verta. Tai ir yra vertė.
          </p>
        </section>
        <section>
          <h2>Kodėl vienas statymas nieko nereiškia</h2>
          <p>
            Net ir statymas su +5 % verte pralaimi maždaug pusę kartų. Vertė pasireiškia tik per didelį skaičių statymų: po šimto
            rezultatas dar labai priklauso nuo sėkmės, po tūkstančio — jau daug mažiau. Minusinės dienos ir net savaitės yra normalu.
          </p>
          <p>
            Kaip gali atrodyti tūkstantis statymų, pamatysi{' '}
            <Link href="/skaiciuokle" className={link}>
              skaičiuoklėje
            </Link>
            : ji rodo ir blogus, ir gerus scenarijus.
          </p>
        </section>
        <section>
          <h2>Ko vertė negarantuoja</h2>
          <ul>
            <li>Pelno per konkretų laikotarpį. Rezultatas svyruoja, o istorija visada trumpesnė, nei norėtųsi.</li>
            <li>Kad kaina išsilaikys. Kontoros taiso koeficientus kas kelias minutes; prieš statydamas patikrink kainą.</li>
            <li>Kad kontora leis statyti daug. Laimintiems lošėjams limitai dažnai mažinami — apie tai atskiras gidas.</li>
          </ul>
        </section>
        <section>
          <h2>Kaip tai daro Statyk</h2>
          <p>
            Visą parą lyginam 7BET, TopSport ir Betsson kainas su Pinnacle kaina be maržos ir parodom, kur Lietuvos kontora moka
            daugiau. Kaip tai matuojam ir kokie mūsų rezultatai, aprašyta{' '}
            <Link href="/metodika" className={link}>
              metodikoje
            </Link>
            .
          </p>
        </section>
      </>
    ),
  },
  {
    slug: 'kas-yra-clv',
    title: 'Kas yra CLV ir kodėl jis svarbesnis už pelną',
    description:
      'CLV (closing line value) parodo, ar tavo kaina buvo geresnė už uždarymo kainą. Kodėl jis greičiau už pelną atskiria gerus statymus nuo sėkmės ir kaip jį skaičiuoti.',
    updated: '2026 m. rugsėjo 24 d.',
    updatedIso: '2026-09-24',
    minutes: 4,
    body: (
      <>
        <section>
          <h2>Trumpai</h2>
          <p>
            CLV (angl. <em>closing line value</em>) — tai skirtumas tarp kainos, kurią gavai, ir tikrosios kainos prieš pat rungtynių
            pradžią. Jei pastatei už 2,10, o prieš startą tikroji kaina buvo 2,00, tavo CLV yra +5 %.
          </p>
        </section>
        <section>
          <h2>Kodėl uždarymo kaina tokia svarbi</h2>
          <p>
            Prieš pat rungtynes rinka žino beveik viską: sudėtis, traumas, orą, didelių lošėjų nuomonę. Paskutinė Pinnacle kaina be
            maržos yra geriausias viešas tikimybės įvertis, kokį turim. Jei nuolat gauni geresnę kainą už ją, vadinasi, statai anksčiau
            nei rinka pataiso klaidą.
          </p>
        </section>
        <section>
          <h2>Kodėl CLV greitesnis už pelną</h2>
          <p>
            Pelnas priklauso nuo to, kas laimėjo — o tai labai triukšminga. Po 200 statymų gali būti minuse net su gera strategija. CLV
            kiekvienam statymui gaunamas iškart ir svyruoja daug mažiau, todėl jau po kelių šimtų statymų matyti, ar kainos buvo geros.
          </p>
          <p>Teigiamas CLV negarantuoja pelno kiekvieną mėnesį, bet ilgainiui jis su pelnu stipriai susijęs.</p>
        </section>
        <section>
          <h2>Kaip skaičiuojama</h2>
          <p>
            CLV = tavo koeficientas × uždarymo tikimybė − 1. Pavyzdys: statei už 2,10, uždarymo tikroji kaina 2,00 (tikimybė 50 %):
            2,10 × 0,50 − 1 = +5 %.
          </p>
          <p>
            Svarbu, kad uždarymo kaina būtų tos pačios rinkos ir linijos, užfiksuota prieš pat pradžią. Jei tokios kainos nėra, statymas
            neturi CLV — jo negalima išgalvoti.
          </p>
        </section>
        <section>
          <h2>Kur tai matyti Statyk</h2>
          <p>
            Kiekvienam pažymėtam statymui sekimo lentelėje rodom jo CLV, o{' '}
            <Link href="/metodika" className={link}>
              metodikoje
            </Link>{' '}
            — kiek mūsų signalų pagavo geresnę kainą nei uždarymas.
          </p>
        </section>
      </>
    ),
  },
  {
    slug: 'kelly-kriterijus',
    title: 'Kelly kriterijus: kiek statyti vienam statymui',
    description:
      'Kelly kriterijus parenka statymo dydį pagal vertę ir koeficientą. Kodėl verta naudoti tik jo dalį (¼ Kelly), kaip apskaičiuoti ir kodėl reikia viršutinės ribos.',
    updated: '2026 m. rugsėjo 24 d.',
    updatedIso: '2026-09-24',
    minutes: 5,
    body: (
      <>
        <section>
          <h2>Trumpai</h2>
          <p>
            Kelly kriterijus atsako į klausimą, kokią banko dalį statyti, kad bankas ilgainiui augtų greičiausiai. Kuo didesnė vertė ir
            kuo mažesnis koeficientas, tuo didesnė dalis.
          </p>
        </section>
        <section>
          <h2>Formulė</h2>
          <p>
            Dalis = (b × p − q) / b, kur b yra koeficientas minus 1, p — tikroji tikimybė, q = 1 − p.
          </p>
          <p>
            Pavyzdys: koeficientas 2,10 (b = 1,10), tikroji tikimybė 50 %. Dalis = (1,10 × 0,5 − 0,5) / 1,10 ≈ 4,5 % banko. Su 1 000 €
            banku tai būtų 45 €.
          </p>
        </section>
        <section>
          <h2>Kodėl tik ketvirtis</h2>
          <p>
            Pilnas Kelly daro prielaidą, kad tikimybę žinai tiksliai. Iš tikrųjų ji yra tik įvertis, o bankas su pilnu Kelly svyruoja
            labai stipriai: neretai sumažėja perpus prieš pradėdamas augti. Todėl dauguma naudoja dalį — dažniausiai ¼. Augimas lėtesnis,
            bet svyravimai daug mažesni, o klaida įvertinant tikimybę kainuoja mažiau.
          </p>
        </section>
        <section>
          <h2>Viršutinė riba ir kontorų limitai</h2>
          <p>
            Net su ketvirčiu Kelly verta turėti viršutinę ribą, pavyzdžiui 5 % banko vienam statymui, ir niekada nestatyti daugiau, nei
            leidžia kontora. Jei toje pačioje baigtyje jau esi pastatęs kitoje kontoroje, tai skaičiuojasi į tą pačią sumą.
          </p>
        </section>
        <section>
          <h2>Kaip tai daro Statyk</h2>
          <p>
            Kiekvienam signalui siūloma suma skaičiuojama iš tavo banko pagal pasirinktą Kelly dalį, su 5 % viršutine riba ir tavo
            įrašytais kontorų limitais. Kaip atrodo tūkstantis tokių statymų, rodo{' '}
            <Link href="/skaiciuokle" className={link}>
              skaičiuoklė
            </Link>
            .
          </p>
        </section>
      </>
    ),
  },
  {
    slug: 'kontoros-riboja-laimetojus',
    title: 'Kodėl Lietuvos kontoros riboja laiminčius ir ką daryti',
    description:
      'Laimintiems lošėjams kontoros dažnai sumažina limitus. Ką sako Lietuvos teismų praktika, kaip paprašyti paaiškinimo ir kaip su limitais gyventi.',
    updated: '2026 m. rugsėjo 24 d.',
    updatedIso: '2026-09-24',
    minutes: 4,
    body: (
      <>
        <section>
          <h2>Kodėl taip nutinka</h2>
          <p>
            Kontoros uždirba iš maržos ir iš lošėjų, kurie stato be vertės. Lošėjas, kuris nuolat gauna geresnę kainą už rinką, joms
            nuostolingas, todėl jo limitai dažnai sumažinami iki kelių eurų.
          </p>
        </section>
        <section>
          <h2>Ką sako teismai</h2>
          <p>
            Lietuvoje Lošimų priežiūros tarnyba yra skyrusi baudas kontoroms už lošėjų ribojimą be pagrindo jų pačių taisyklėse, o
            teismai tokias baudas yra patvirtinę. Tai nereiškia, kad ribojimas visada neteisėtas, bet kontora turi galėti nurodyti,
            kuriuo taisyklių punktu remiasi.
          </p>
        </section>
        <section>
          <h2>Ką daryti, jei tave apribojo</h2>
          <ul>
            <li>Raštu paprašyk kontoros nurodyti taisyklių punktą, pagal kurį sumažintas limitas.</li>
            <li>Jei aiškaus pagrindo nėra, gali kreiptis į Lošimų priežiūros tarnybą.</li>
            <li>Tuo metu statyk kitose kontorose. Kuo daugiau licencijuotų kontorų paskyrų turi, tuo mažiau priklausai nuo vienos.</li>
          </ul>
        </section>
        <section>
          <h2>Kaip gyventi su limitais</h2>
          <p>
            Įrašyk tikrą kiekvienos kontoros limitą. Tada siūloma suma jo niekada neviršys, o signalus, kurių kontora nebeleidžia
            pastatyti verta suma, galėsi atsijoti. Statyk profilyje limitų istorija lieka tavo įrodymu, jei kreipsiesi į
            tarnybą.
          </p>
          <p>
            Tik nuo 18 metų. Lošimas gali sukelti priklausomybę. Apriboti sau galimybę lošti gali per{' '}
            <a href="https://lpt.lrv.lt" rel="noopener" className={link}>
              Lošimų priežiūros tarnybą
            </a>
            .
          </p>
        </section>
      </>
    ),
  },
  {
    slug: 'bankrollo-valdymas',
    title: 'Bankrollo valdymas: kiek skirti ir kiek statyti',
    description:
      'Kaip pasirinkti bankrollą, kodėl statyti tik mažą jo dalį, kada rinktis fiksuotą sumą ir kaip neišsigąsti blogos savaitės.',
    updated: '2026 m. rugsėjo 25 d.',
    updatedIso: '2026-09-25',
    minutes: 4,
    body: (
      <>
        <section>
          <h2>Trumpai</h2>
          <p>
            Bankrollas yra suma, kurią skiri tik statymams ir kurios praradimas tavo gyvenimo nepakeistų. Iš jo statai mažas dalis:
            tiek, kad net ilga bloga serija jo nesunaikintų.
          </p>
        </section>
        <section>
          <h2>Kiek skirti</h2>
          <p>
            Tiek, kiek galėtum prarasti visą. Tai ne formalumas: net statymai su verte ištisas savaites gali būti minuse, o nuo to
            niekas neapsaugo. Pinigai nuomai, paskolai ar kasdienėms išlaidoms į bankrollą nepatenka.
          </p>
          <p>Bankrollą laikyk atskirai ir jo nepildyk po kiekvieno pralaimėjimo. Papildymą užsirašyk, kad matytum tikrą rezultatą.</p>
        </section>
        <section>
          <h2>Kiek statyti vienam signalui</h2>
          <p>
            Yra du įprasti būdai. <strong className="text-chalk">Pagal vertę</strong> (Kelly kriterijus): kuo didesnė vertė ir mažesnis
            koeficientas, tuo didesnė suma. Pilnas Kelly per daug svyruoja, todėl naudojama jo dalis, dažniausiai ketvirtis.{' '}
            <strong className="text-chalk">Fiksuota suma</strong>: kiekvienam signalui ta pati suma, pavyzdžiui, 1 % bankrollo.
            Paprasčiau skaičiuoti, šiek tiek lėčiau auga.
          </p>
          <p>
            Kad ir kurį pasirinktum, viena taisyklė galioja visada: ne daugiau nei keli procentai bankrollo vienam statymui. Statyk
            niekada nesiūlo daugiau nei 5 %, o sumą gali pasirinkti profilyje. Plačiau apie Kelly —{' '}
            <Link href="/gidai/kelly-kriterijus" className={link}>
              atskirame gide
            </Link>
            .
          </p>
        </section>
        <section>
          <h2>Kai bankrollas keičiasi</h2>
          <p>
            Suma skaičiuojama nuo dabartinio bankrollo: laimint ji po truputį auga, pralaimint mažėja. Tai natūrali apsauga: blogos
            serijos metu statai mažiau ir bankrollas tirpsta lėčiau.
          </p>
        </section>
        <section>
          <h2>Kaip neišsigąsti blogos savaitės</h2>
          <ul>
            <li>Vertink ne pelną, o CLV: ar tavo kainos buvo geresnės už uždarymo kainą. Jis parodo kryptį daug greičiau.</li>
            <li>Nedidink sumų, kad „atsiimtum“. Tai greičiausias kelias prarasti bankrollą.</li>
            <li>
              Pažiūrėk, kaip tūkstantis statymų atrodo{' '}
              <Link href="/skaiciuokle" className={link}>
                skaičiuoklėje
              </Link>
              : minusiniai tarpai ten normalūs.
            </li>
          </ul>
          <p>
            Tik nuo 18 metų. Jei lošimas nustoja būti kontroliuojamas, apriboti sau galimybę lošti gali per{' '}
            <a href="https://lpt.lrv.lt" rel="noopener" className={link}>
              Lošimų priežiūros tarnybą
            </a>
            .
          </p>
        </section>
      </>
    ),
  },
  {
    slug: 'kaip-statyti-pagal-signala',
    title: 'Kaip statyti pagal signalą: nuo pranešimo iki įrašo',
    description:
      'Ką daryti gavus signalą: patikrinti kainą kontoroje, pasirinkti sumą, pastatyti ir pažymėti statymą, kad vėliau matytum CLV ir rezultatą.',
    updated: '2026 m. rugsėjo 25 d.',
    updatedIso: '2026-09-25',
    minutes: 3,
    body: (
      <>
        <section>
          <h2>1. Atidaryk signalą</h2>
          <p>
            Signale matysi rungtynes, statymą, kontorą, jos koeficientą ir tikrąją kainą be maržos. Vertė — kiek kontoros kaina geresnė
            už tikrąją. Taip pat matysi, kada signalą radom: senesnė kaina dažniau jau pasikeitusi.
          </p>
        </section>
        <section>
          <h2>2. Patikrink kainą kontoroje</h2>
          <p>
            Kontoros taiso koeficientus kas kelias minutes. Nukopijuok rungtynių pavadinimą, surask jas kontoroje ir palygink
            koeficientą. Jei jis nukrito ir vertės neliko, praleisk. Tai dažna ir normalu.
          </p>
        </section>
        <section>
          <h2>3. Statyk siūlomą sumą</h2>
          <p>
            Siūloma suma skaičiuojama nuo tavo bankrollo ir pasirinkto būdo (pagal vertę arba fiksuota), neviršija 5 % bankrollo ir
            tavo įrašyto kontoros limito. Jei kontora leido pastatyti mažiau, įrašyk tiek, kiek pastatei.
          </p>
        </section>
        <section>
          <h2>4. Pažymėk statymą</h2>
          <p>
            Paspausk „Pastačiau“ ir, jei reikia, pataisyk koeficientą ar sumą. Pažymėtas statymas atsiskaito pats, kai rungtynės
            baigiasi, o prieš pradžią užfiksuojam uždarymo kainą, kad matytum savo CLV.
          </p>
        </section>
        <section>
          <h2>5. Žiūrėk į CLV, ne į vieną dieną</h2>
          <p>
            Statymų puslapyje matysi rezultatą, CLV ir kiek statymų aplenkė uždarymo kainą. Visų mūsų signalų įrašas yra{' '}
            <Link href="/rezultatai" className={link}>
              rezultatų puslapyje
            </Link>
            . Kodėl CLV svarbesnis už pelną, paaiškinta{' '}
            <Link href="/gidai/kas-yra-clv" className={link}>
              CLV gide
            </Link>
            .
          </p>
        </section>
      </>
    ),
  },
]

export const guideBySlug = (slug: string) => GUIDES.find((guide) => guide.slug === slug)
