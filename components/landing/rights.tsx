import { ArrowUpRight } from 'lucide-react'
import { Reveal, Roll } from './motion-primitives'

const RULINGS = [
  {
    date: '2026 m. vasario 18 d.',
    fine: 15000,
    text: 'UAB „Amber Gaming“ apribojo lošėją už statymus žemesnių lygų rungtynėse, nors tokio pagrindo jos taisyklėse nebuvo. Teismas: jei kontora pati siūlo tokius statymus, vėliau riboti už jų naudojimą ji negali.',
    href: 'https://www.teismai.lt/lt/naujienos/teismu-pranesimai-spaudai/lvat-losimu-bendroves-negali-elgtis-savavaliskai-loseju-atzvilgiu/14027',
  },
  {
    date: '2025 m. balandžio 16 d.',
    fine: 6000,
    text: 'Kontora lošėjui pritaikė „supaprastintą lažybų pasiūlą“, kurios jos taisyklės nenumatė. Teismas: ribojimo atvejai turi būti aiškiai aprašyti ir paskelbti iš anksto.',
    href: 'https://www.teismai.lt/lt/teismu-pranesimai-spaudai/lvat-losimu-bendroves-neturi-neribotos-diskrecijos-spresti-del-loseju-teises-statyti/13309',
  },
]

export function Rights() {
  return (
    <section className="bg-cream px-5 py-[clamp(80px,10vw,160px)] text-ink sm:px-8">
      <div className="mx-auto max-w-[80rem]">
        <Reveal>
          <h2 className="text-[clamp(2.25rem,4.5vw,4rem)] leading-[0.95] text-ink">Kontora negali tavęs riboti savavališkai</h2>
        </Reveal>
        <Reveal delay={80}>
          <p className="mt-5 max-w-[64ch] text-[clamp(1.05rem,1.4vw,1.25rem)] text-moss">
            Lietuvos vyriausiasis administracinis teismas du kartus patvirtino Lošimų priežiūros tarnybos baudas kontoroms, kurios ribojo
            lošėjus be pagrindo savo taisyklėse. Limitai nedingsta, todėl kiekvienai kontorai įrašai savo, o siūloma suma prie jo
            prisitaiko.
          </p>
        </Reveal>
        <div className="mt-[clamp(40px,5vw,72px)] grid gap-5 lg:grid-cols-2">
          {RULINGS.map((ruling, index) => (
            <Reveal key={ruling.date} delay={index * 80}>
              <article className="h-full rounded-[20px] bg-white p-[clamp(22px,3vw,32px)] shadow-[inset_0_0_0_1px_rgb(11_31_23/0.08)]">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="text-[0.9375rem] text-moss">{ruling.date}</span>
                  <Roll value={ruling.fine} suffix=" €" className="font-display text-[2rem] leading-none font-extrabold tracking-[-0.03em] text-ink" />
                </div>
                <p className="mt-[18px] text-ink">{ruling.text}</p>
                <a
                  href={ruling.href}
                  rel="noopener"
                  className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-semibold text-field underline decoration-field/40 underline-offset-4 hover:decoration-field"
                >
                  Teismo pranešimas
                  <ArrowUpRight className="size-4" aria-hidden />
                </a>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-12 grid gap-6 border-t border-ink/10 pt-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <h3 className="text-[clamp(1.5rem,2.2vw,2rem)] tracking-[-0.02em] text-ink">Kodėl Lietuvos kontoros klysta</h3>
          <div className="max-w-[40rem] space-y-4 text-moss">
            <p>
              Lietuvoje legaliai statyti galima tik licencijuotose kontorose. Vietinės kontoros konkuruoja tarpusavyje, ne su visu pasauliu,
              todėl kainą pataisyti joms nėra taip skubu.
            </p>
            <p>
              Pinnacle kaina keičiasi, kai tik stambūs lošėjai sužino ką nors naujo. Lietuvos kontora kartais atsilieka minutėmis ar
              valandomis. Tas atotrūkis ir yra signalas.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
