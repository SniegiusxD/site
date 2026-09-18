import type { Metadata } from 'next'
import { ProsePage } from '@/components/landing/prose-page'
import { brand } from '@/lib/brand'
import { PRICE_EUR_PER_MONTH, TRIAL_DAYS } from '@/lib/subscription'

export const metadata: Metadata = {
  title: `Naudojimosi taisyklės | ${brand.name}`,
}

export default function TermsPage() {
  return (
    <ProsePage
      title="Naudojimosi taisyklės"
      updated="2026 m. rugsėjo 14 d."
      notice="Juodraštis. Prieš paleidžiant bus įrašyti paslaugos teikėjo rekvizitai, kontaktai ir mokėjimo sąlygos."
    >
      <section>
        <h2>Kas tai per paslauga</h2>
        <p>
          {brand.name} lygina Lietuvos lažybų bendrovių 7BET, TopSport ir Betsson koeficientus su
          Pinnacle kainomis ir parodo, kur kaina gali būti palanki lošėjui. Tai informacija apie
          kainas, ne patarimas lažintis ir ne pažadas laimėti.
        </p>
        <p>Mes nepriimam statymų, nevaldom tavo lėšų ir nesame susiję su lažybų bendrovėmis.</p>
      </section>

      <section>
        <h2>Kas gali naudotis</h2>
        <ul>
          <li>Tik asmenys, kuriems yra 18 metų.</li>
          <li>Negalima naudotis, jei esi įtrauktas į asmenų, kuriems draudžiama lošti, registrą.</li>
          <li>Statai savo vardu, licencijuotose bendrovėse, laikydamasis jų taisyklių.</li>
        </ul>
      </section>

      <section>
        <h2>Paskyra</h2>
        <ul>
          <li>Viena paskyra vienam žmogui. Prisijungimo duomenų neperduok kitiems.</li>
          <li>Signalų negalima perparduoti ar viešai platinti.</li>
          <li>Pažeidus šias taisykles, paskyra gali būti sustabdyta.</li>
        </ul>
      </section>

      <section>
        <h2>Bandymas ir kaina</h2>
        <p>
          Nemokama paskyra neturi termino: joje matai signalus iki 2 % vertės ir iki 2,50
          koeficiento. Visus signalus atrakina {TRIAL_DAYS} dienų bandymas (kortelės neprašom) arba
          prenumerata už {PRICE_EUR_PER_MONTH} € per mėnesį. Prenumeratą gali atšaukti bet kada:
          prieiga lieka iki apmokėto laikotarpio pabaigos, paskui paskyra grįžta į nemokamą planą.
        </p>
      </section>

      <section>
        <h2>Jokių garantijų</h2>
        <p>
          Koeficientai keičiasi kas kelias minutes, todėl signalas gali užsidaryti, kol jį
          atidarai. Duomenys gali vėluoti ar būti netikslūs. Net statymai su tikra verte dažnai
          pralaimi, o rezultatai per trumpą laiką stipriai svyruoja. Už sprendimus statyti ir jų
          pasekmes atsakai pats.
        </p>
      </section>

      <section>
        <h2>Atsakingas lošimas</h2>
        <p>
          Lošimas gali sukelti priklausomybę. Jei jauti, kad lošimas tampa problema, gali apriboti
          sau galimybę lošti per Lošimų priežiūros tarnybą (lpt.lrv.lt).
        </p>
      </section>

      <section>
        <h2>Pakeitimai</h2>
        <p>Apie esminius taisyklių pakeitimus pranešim el. paštu ar paskyroje prieš jiems įsigaliojant.</p>
      </section>
    </ProsePage>
  )
}
