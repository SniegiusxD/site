import type { Metadata } from 'next'
import { ProsePage } from '@/components/landing/prose-page'
import { brand } from '@/lib/brand'

export const metadata: Metadata = {
  title: `Privatumo politika | ${brand.name}`,
}

export default function PrivacyPage() {
  return (
    <ProsePage
      title="Privatumo politika"
      updated="2026 m. rugsėjo 25 d."
      notice="Juodraštis. Prieš paleidžiant bus įrašyti duomenų valdytojo rekvizitai ir kontaktai."
    >
      <section>
        <h2>Kokius duomenis renkam</h2>
        <ul>
          <li>El. pašto adresą ir slaptažodį (saugom tik užšifruotą maišą, ne patį slaptažodį).</li>
          <li>Tavo nustatymus: bankrollą, kontoras, filtrus, Kelly dalį ir limitus.</li>
          <li>Bankrollo įrašus (įnešimus, išėmimus) ir statymus, kuriuos pats pažymi.</li>
          <li>Prisijungimo sesijos duomenis: IP adresą ir naršyklės tipą, kad paskyra būtų saugi.</li>
          <li>Jei prijungsi Telegram, tavo Telegram pokalbio identifikatorių.</li>
          <li>Jei parašysi per kontaktų formą ar pagalbos puslapį — žinutę ir el. paštą, kuriuo atsakyti.</li>
          <li>
            Klaidų pranešimus iš naršyklės ir serverio: klaidos tekstą, puslapio adresą be parametrų ir versiją. Jie nesiejami su
            tavo paskyra.
          </li>
        </ul>
      </section>

      <section>
        <h2>Kam juos naudojam</h2>
        <p>
          Tik paslaugai teikti: rodyti tau tinkamus signalus, skaičiuoti sumas, sekti statymus ir
          siųsti pranešimus, kuriuos pats įsijungei. Duomenų neparduodam ir neperduodam reklamos
          tikslais.
        </p>
      </section>

      <section>
        <h2>Kur jie saugomi</h2>
        <p>
          Svetainė veikia Vercel serveriuose, duomenų bazė yra Neon (PostgreSQL). Lankomumą
          matuojam Vercel Analytics, kuris nenaudoja slapukų sekimui.
        </p>
        <p>
          Mokėjimus tvarko Stripe: kortelės duomenys patenka tiesiai į Stripe, mes jų nematom ir nesaugom. Apsaugai nuo per
          dažnų užklausų naudojam Upstash, kuriame laikomas tik trumpalaikis IP adreso ar sesijos maišas. Laiškus (pvz.
          slaptažodžio keitimo nuorodą) siunčiam per Resend.
        </p>
      </section>

      <section>
        <h2>Kiek laiko saugom</h2>
        <p>
          Kol turi paskyrą. Ištrynus paskyrą, susiję duomenys ištrinami kartu su ja. Klaidų pranešimai saugomi iki 30 dienų,
          žinutės per kontaktų formą — kol į jas atsakom ir kiek to reikia susirašinėjimui.
        </p>
      </section>

      <section>
        <h2>Tavo teisės</h2>
        <p>
          Pagal Bendrąjį duomenų apsaugos reglamentą gali prašyti parodyti, ištaisyti ar ištrinti
          savo duomenis, apriboti jų tvarkymą ir gauti juos perkeliamu formatu. Taip pat gali
          kreiptis į Valstybinę duomenų apsaugos inspekciją.
        </p>
      </section>
    </ProsePage>
  )
}
