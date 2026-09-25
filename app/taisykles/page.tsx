import type { Metadata } from 'next'
import { ProsePage } from '@/components/landing/prose-page'
import { brand } from '@/lib/brand'
import { field, legalEntity, legalEntityComplete, MIN_AGE } from '@/lib/legal-entity'
import { PRICE_EUR_PER_MONTH, TRIAL_DAYS } from '@/lib/subscription'

export const metadata: Metadata = {
  title: `Naudojimosi taisyklės | ${brand.name}`,
}

// Public page: operators are deliberately not named here. The regulator treats a
// public text that names a gambling operator as gambling advertising
// (planning/LEGAL_CHECK_LT_GAMBLING_ADS_2026-09-25.md in the aggregator repo).
export default function TermsPage() {
  const email = field(legalEntity.email, 'el. paštas')
  return (
    <ProsePage
      title="Naudojimosi taisyklės"
      updated="2026 m. rugsėjo 25 d."
      notice={legalEntityComplete ? undefined : 'Juodraštis: dar neįrašyti paslaugos teikėjo rekvizitai.'}
    >
      <section>
        <h2>Kas teikia paslaugą</h2>
        <p>
          {brand.name} paslaugą teikia {field(legalEntity.name, 'pavadinimas')}, kodas{' '}
          {field(legalEntity.code, 'įmonės kodas')}, adresas {field(legalEntity.address, 'adresas')}
          {legalEntity.vatCode ? `, PVM mokėtojo kodas ${legalEntity.vatCode}` : ''}. Susisiekti:{' '}
          {email} arba per <a href="/kontaktai">kontaktų formą</a>.
        </p>
        <p>
          Šios taisyklės yra sutartis tarp tavęs ir mūsų. Registruodamasis patvirtini, kad jas
          perskaitei ir sutinki.
        </p>
      </section>

      <section>
        <h2>Kas tai per paslauga</h2>
        <p>
          Lyginam Lietuvoje licencijuotų lažybų bendrovių koeficientus su tarptautinės rinkos kaina
          ir prisijungusiam nariui parodom, kur koeficientas aukštesnis už rinkos įvertinimą. Tai
          informacija apie kainas. Tai nėra kvietimas lažintis, investavimo ar finansinis patarimas
          ir pažadas laimėti.
        </p>
        <ul>
          <li>Mes nesam lošimų organizatorius: nepriimam statymų ir nevaldom tavo pinigų.</li>
          <li>Nesam susiję su jokia lažybų bendrove ir iš jų negaunam atlygio.</li>
          <li>Ar statyti, kiek ir kur, sprendi tik tu.</li>
        </ul>
      </section>

      <section>
        <h2>Kas gali naudotis</h2>
        <ul>
          <li>Tik asmenys, kuriems yra {MIN_AGE} metai ar daugiau. Tai minimalus lošimo amžius Lietuvoje.</li>
          <li>
            Negalima naudotis, jei esi apribojęs sau galimybę lošti Lošimų priežiūros tarnybos
            registre arba jei lošti tau draudžia įstatymas.
          </li>
          <li>Statai tik Lietuvoje licencijuotose bendrovėse, savo vardu ir laikydamasis jų taisyklių.</li>
          <li>Paslauga skirta asmeniniam naudojimui, ne verslui.</li>
        </ul>
      </section>

      <section>
        <h2>Paskyra</h2>
        <ul>
          <li>Viena paskyra vienam žmogui. Prisijungimo duomenų neperduok kitiems.</li>
          <li>
            Signalų, kainų ir kitos paskyroje matomos informacijos negalima perparduoti, viešai
            platinti ar automatiškai rinkti.
          </li>
          <li>
            Pažeidus šias taisykles, galim sustabdyti ar uždaryti paskyrą. Apie tai pranešim el.
            paštu ir nurodysim priežastį. Už nepanaudotą apmokėtą laikotarpį grąžinsim proporcingą
            sumą, nebent paskyra uždaryta dėl sukčiavimo.
          </li>
          <li>Paskyrą gali ištrinti bet kada profilyje. Kartu ištrinami ir tavo duomenys.</li>
        </ul>
      </section>

      <section>
        <h2>Planai ir kaina</h2>
        <ul>
          <li>
            Nemokama paskyra neturi termino. Joje matai dalį signalų: iki 2 % vertės ir iki 2,50
            koeficiento.
          </li>
          <li>
            Visus signalus atrakina {TRIAL_DAYS} dienų bandymas. Kortelės neprašom, bandymą gali
            pradėti vieną kartą. Pasibaigus bandymui, paskyra grįžta į nemokamą planą, nebent pats
            užsisakai prenumeratą.
          </li>
          <li>
            Prenumerata kainuoja {PRICE_EUR_PER_MONTH} € per mėnesį, su visais mokesčiais. Ji
            atsinaujina kas mėnesį, kol ją atšauki. Mokėjimus tvarko Stripe.
          </li>
          <li>
            Atšaukti gali bet kada profilyje. Prieiga lieka iki apmokėto laikotarpio pabaigos, paskui
            paskyra grįžta į nemokamą planą.
          </li>
          <li>Apie kainos pakeitimą pranešim bent prieš 30 dienų. Nauja kaina galios tik nuo kito laikotarpio.</li>
        </ul>
      </section>

      <section>
        <h2>Teisė atsisakyti per 14 dienų</h2>
        <p>
          Per 14 dienų nuo pirmojo mokėjimo gali atsisakyti prenumeratos be priežasties: parašyk
          mums {email}. Kadangi paskyra atrakinama iškart, kai sumoki (to paprašai užsisakydamas),
          grąžinsim sumokėtą sumą, atėmę proporcingą dalį už dienas, kai prieiga jau veikė. Pinigus
          grąžinsim per 14 dienų tuo pačiu mokėjimo būdu.
        </p>
      </section>

      <section>
        <h2>Jokių garantijų</h2>
        <p>
          Koeficientai keičiasi kas kelias minutes, todėl signalas gali užsidaryti, kol jį
          atidarai. Duomenys gali vėluoti ar būti netikslūs, o paslauga kartais gali neveikti. Net
          statymai su tikra verte dažnai pralaimi, o rezultatai per trumpą laiką stipriai svyruoja.
          Praeities rezultatai negarantuoja ateities rezultatų.
        </p>
        <p>
          Neatsakom už pinigus, kuriuos laimi ar pralaimi statydamas. Kitais atvejais atsakom tiek,
          kiek numato Lietuvos teisė. Šios taisyklės neriboja tavo, kaip vartotojo, teisių, kurių
          negalima riboti pagal įstatymą.
        </p>
      </section>

      <section>
        <h2>Atsakingas lošimas</h2>
        <p>Dalyvavimas azartiniuose lošimuose gali sukelti priklausomybę.</p>
        <ul>
          <li>Statyk tik tiek, kiek gali sau leisti prarasti. Profilyje gali nustatyti, kiek daugiausia statyti vienoje kontoroje.</li>
          <li>
            Apriboti sau galimybę lošti visose Lietuvos lošimų bendrovėse gali per Lošimų priežiūros
            tarnybą (<a href="https://lpt.lrv.lt">lpt.lrv.lt</a>).
          </li>
          <li>
            Jei sunku, kalbėk: emocinės paramos „Vilties linija“ 116 123 veikia visą parą, pagalbą dėl
            priklausomybės teikia Respublikinis priklausomybės ligų centras.
          </li>
          <li>Jei paprašysi, uždarysim tavo paskyrą.</li>
        </ul>
      </section>

      <section>
        <h2>Ginčai</h2>
        <p>
          Jei kažkas negerai, pirmiausia parašyk mums {email}. Atsakysim per 14 dienų. Jei
          nesutarsim, vartotojas gali kreiptis į Valstybinę vartotojų teisių apsaugos tarnybą
          (<a href="https://www.vvtat.lt">vvtat.lt</a>) arba į teismą. Taikoma Lietuvos Respublikos
          teisė.
        </p>
      </section>

      <section>
        <h2>Pakeitimai</h2>
        <p>
          Apie esminius taisyklių pakeitimus pranešim el. paštu ar paskyroje bent prieš 14 dienų. Jei
          nesutinki, gali atšaukti prenumeratą ir ištrinti paskyrą, kol pakeitimai neįsigaliojo.
        </p>
      </section>
    </ProsePage>
  )
}
