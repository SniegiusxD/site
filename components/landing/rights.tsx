import { ArrowUpRight, Scale } from 'lucide-react'

const RULINGS = [
  {
    date: '2026 m. vasario 18 d.',
    fine: '15 000 €',
    text: 'UAB „Amber Gaming“ apribojo lošėją už statymus žemesnių lygų rungtynėse, nors tokio pagrindo jos taisyklėse nebuvo. Teismas: jei kontora pati siūlo tokius statymus, vėliau riboti už jų naudojimą ji negali.',
    href: 'https://www.teismai.lt/lt/naujienos/teismu-pranesimai-spaudai/lvat-losimu-bendroves-negali-elgtis-savavaliskai-loseju-atzvilgiu/14027',
  },
  {
    date: '2025 m. balandžio 16 d.',
    fine: '6 000 €',
    text: 'Kontora lošėjui pritaikė „supaprastintą lažybų pasiūlą“, kurios jos taisyklės nenumatė. Teismas: ribojimo atvejai turi būti aiškiai aprašyti ir paskelbti iš anksto.',
    href: 'https://www.teismai.lt/lt/teismu-pranesimai-spaudai/lvat-losimu-bendroves-neturi-neribotos-diskrecijos-spresti-del-loseju-teises-statyti/13309',
  },
]

export function Rights() {
  return (
    <section className="border-t border-rail bg-night-deep">
      <div className="mx-auto max-w-[80rem] px-5 py-24 sm:px-8 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="max-w-[34rem]">
            <Scale className="size-9 text-haze" aria-hidden />
            <h2 className="mt-6 text-[3rem] sm:text-[4rem]">Kontora negali tavęs riboti savavališkai</h2>
            <p className="mt-6 text-haze">
              Lietuvos vyriausiasis administracinis teismas du kartus patvirtino Lošimų priežiūros
              tarnybos baudas kontoroms, kurios ribojo lošėjus be pagrindo savo taisyklėse.
            </p>
            <p className="mt-4 text-haze">
              Tai nereiškia, kad limitų nebelieka: kontoros vis dar nustato didžiausias sumas.
              Todėl kiekvienai kontorai įrašai savo limitą, o siūloma suma prie jo prisitaiko.
            </p>
          </div>

          <ol className="grid gap-4">
            {RULINGS.map((ruling) => (
              <li key={ruling.date} className="rounded-2xl bg-stand p-6 hairline sm:p-8">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="text-haze">{ruling.date}</p>
                  <p className="font-display text-5xl font-bold tnum">{ruling.fine}</p>
                </div>
                <p className="mt-4">{ruling.text}</p>
                <a
                  href={ruling.href}
                  rel="noopener"
                  className="mt-5 inline-flex items-center gap-1.5 text-[0.95rem] text-chalk underline decoration-rail-strong underline-offset-4 transition-colors hover:decoration-chalk"
                >
                  Teismo pranešimas
                  <ArrowUpRight className="size-4" aria-hidden />
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
