import type { Metadata } from 'next'
import { ProsePage } from '@/components/landing/prose-page'
import { brand } from '@/lib/brand'
import { field, legalEntity, legalEntityComplete, MIN_AGE } from '@/lib/legal-entity'

export const metadata: Metadata = {
  title: `Privatumo politika | ${brand.name}`,
}

export default function PrivacyPage() {
  const email = field(legalEntity.email, 'el. paštas')
  return (
    <ProsePage
      title="Privatumo politika"
      updated="2026 m. rugsėjo 25 d."
      notice={legalEntityComplete ? undefined : 'Juodraštis: dar neįrašyti duomenų valdytojo rekvizitai.'}
    >
      <section>
        <h2>Kas tvarko tavo duomenis</h2>
        <p>
          Duomenų valdytojas yra {field(legalEntity.name, 'pavadinimas')}, kodas{' '}
          {field(legalEntity.code, 'įmonės kodas')}, adresas {field(legalEntity.address, 'adresas')}.
          Dėl duomenų rašyk {email}.
        </p>
      </section>

      <section>
        <h2>Kokius duomenis renkam ir kodėl</h2>
        <ul>
          <li>
            <strong>Paskyra:</strong> el. pašto adresas ir slaptažodis. Slaptažodį saugom tik kaip
            užšifruotą maišą. Pagrindas: sutarties vykdymas.
          </li>
          <li>
            <strong>Nustatymai ir statymų žurnalas:</strong> bankrolas, kontoros, filtrai, rizikos
            dalis, ribos, bankrolo įrašai ir statymai, kuriuos pažymi pats. Jų reikia, kad
            parodytume tau tinkamus signalus ir sumas. Pagrindas: sutarties vykdymas.
          </li>
          <li>
            <strong>Saugumas:</strong> prisijungimo sesijos, IP adresas ir naršyklės tipas, taip pat
            trumpalaikiai užklausų skaitikliai apsaugai nuo piktnaudžiavimo. Pagrindas: teisėtas
            interesas apsaugoti paskyras ir paslaugą.
          </li>
          <li>
            <strong>Mokėjimai:</strong> prenumeratos būsena, sąskaitos ir mokėjimų istorija. Kortelės
            duomenys patenka tiesiai į Stripe, mes jų nematom. Pagrindas: sutarties vykdymas ir
            buhalterinės apskaitos pareiga.
          </li>
          <li>
            <strong>Telegram:</strong> jei prijungi, saugom tavo Telegram pokalbio identifikatorių,
            kad galėtume siųsti pranešimus, kuriuos įsijungei. Pagrindas: tavo sutikimas. Atjungti
            gali bet kada profilyje.
          </li>
          <li>
            <strong>Žinutės:</strong> ką parašai per kontaktų formą ar pagalbos puslapį, ir el. paštas
            atsakymui. Pagrindas: teisėtas interesas atsakyti.
          </li>
          <li>
            <strong>Klaidų pranešimai:</strong> klaidos tekstas, puslapio adresas be parametrų ir
            versija. Nesiejami su tavo paskyra. Pagrindas: teisėtas interesas, kad paslauga veiktų.
          </li>
          <li>
            <strong>Pradžios žingsniai:</strong> kurį pradžios nustatymų žingsnį pasiekė naršyklė, su atsitiktiniu naršyklės
            identifikatoriumi, nesusietu su paskyra. Saugoma 90 dienų. Pagrindas: teisėtas interesas tobulinti paslaugą.
          </li>
          <li>
            <strong>Lankomumas:</strong> Vercel Analytics suskaičiuoja apsilankymus be sekimo slapukų
            ir be asmens tapatybės. Pagrindas: teisėtas interesas.
          </li>
        </ul>
        <p>
          Duomenų neparduodam, neperduodam reklamai ir neperduodam lažybų bendrovėms. Sprendimų,
          kurie tau sukeltų teisinių pasekmių, automatiškai nepriimam.
        </p>
      </section>

      <section>
        <h2>Kam juos patikim</h2>
        <p>Tik paslaugų teikėjams, kurie tvarko duomenis mūsų vardu ir pagal mūsų nurodymus:</p>
        <ul>
          <li>Vercel (svetainės serveriai, JAV);</li>
          <li>Neon (duomenų bazė, JAV);</li>
          <li>Stripe (mokėjimai, ES ir JAV);</li>
          <li>Upstash (užklausų ribojimas);</li>
          <li>Resend (laiškai, pvz. slaptažodžio atkūrimo nuoroda, JAV);</li>
          <li>Telegram (tik jei prijungi pranešimus).</li>
        </ul>
        <p>
          Kai duomenys perduodami už Europos ekonominės erdvės ribų, tai daroma pagal ES ir JAV
          duomenų apsaugos sistemą arba pagal Europos Komisijos patvirtintas standartines sutarčių
          sąlygas. Duomenis galim atskleisti ir valstybės institucijoms, kai to reikalauja įstatymas.
        </p>
      </section>

      <section>
        <h2>Kiek laiko saugom</h2>
        <ul>
          <li>Paskyros duomenis: kol turi paskyrą. Ištrynus paskyrą, jie ištrinami kartu su ja.</li>
          <li>Sąskaitas ir mokėjimų įrašus: tiek, kiek reikalauja buhalterinės apskaitos įstatymai (iki 10 metų).</li>
          <li>Klaidų pranešimus: iki 30 dienų.</li>
          <li>Žinutes: kol atsakom ir kiek to reikia susirašinėjimui, bet ne ilgiau nei 2 metus.</li>
          <li>Atsargines duomenų bazės kopijas duomenų bazės teikėjas saugo trumpai, paskui jos perrašomos.</li>
        </ul>
      </section>

      <section>
        <h2>Slapukai ir naršyklės atmintis</h2>
        <p>
          Naudojam tik būtiną prisijungimo slapuką. Kai kuriuos nustatymus (pvz. rikiavimą, filtrus,
          animacijų jungiklį) išsaugom tavo naršyklės atmintyje, kad nereikėtų jų rinktis iš naujo.
          Jie niekur nesiunčiami. Reklaminių ir sekimo slapukų nenaudojam.
        </p>
      </section>

      <section>
        <h2>Tavo teisės</h2>
        <p>
          Pagal Bendrąjį duomenų apsaugos reglamentą gali prašyti parodyti, ištaisyti ar ištrinti
          savo duomenis, apriboti jų tvarkymą, nesutikti su tvarkymu pagal teisėtą interesą ir gauti
          savo duomenis perkeliamu formatu. Duomenis atsisiųsti ir paskyrą ištrinti gali pats
          profilyje. Kitais atvejais rašyk {email}: atsakysim per mėnesį. Jei manai, kad pažeidėm
          tavo teises, gali kreiptis į Valstybinę duomenų apsaugos inspekciją (
          <a href="https://vdai.lrv.lt">vdai.lrv.lt</a>).
        </p>
      </section>

      <section>
        <h2>Nepilnamečiai</h2>
        <p>
          Paslauga skirta tik asmenims nuo {MIN_AGE} metų. Jei sužinosim, kad paskyrą susikūrė
          jaunesnis asmuo, ją ištrinsim.
        </p>
      </section>

      <section>
        <h2>Pakeitimai</h2>
        <p>Apie esminius šios politikos pakeitimus pranešim el. paštu ar paskyroje.</p>
      </section>
    </ProsePage>
  )
}
