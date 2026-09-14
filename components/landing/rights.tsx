const RULINGS = [
  {
    date: '2026 m. vasario 18 d.',
    fine: '15 000 €',
    text: 'UAB „Amber Gaming“ apribojo lošėją už statymus žemesnių lygų rungtynėse, nors tokio ribojimo pagrindo jos reglamente nebuvo. Teismas: jei kontora pati siūlo tokius statymus, vėliau riboti už jų naudojimą ji negali.',
    href: 'https://www.teismai.lt/lt/naujienos/teismu-pranesimai-spaudai/lvat-losimu-bendroves-negali-elgtis-savavaliskai-loseju-atzvilgiu/14027',
  },
  {
    date: '2025 m. balandžio 16 d.',
    fine: '6 000 €',
    text: 'Kontora lošėjui pritaikė „supaprastintą lažybų pasiūlą“, kuri nebuvo numatyta jos reglamente. Teismas: ribojimo atvejai turi būti aiškiai aprašyti ir paskelbti iš anksto.',
    href: 'https://www.teismai.lt/lt/teismu-pranesimai-spaudai/lvat-losimu-bendroves-neturi-neribotos-diskrecijos-spresti-del-loseju-teises-statyti/13309',
  },
]

export function Rights() {
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-[76rem] px-5 py-20 sm:px-8 lg:py-28">
        <div className="max-w-[40rem]">
          <h2 className="text-[2.75rem] sm:text-[3.5rem]">
            Kontora negali tavęs riboti savavališkai
          </h2>
          <p className="mt-6">
            Lietuvos vyriausiasis administracinis teismas du kartus patvirtino Lošimų priežiūros
            tarnybos baudas kontoroms, kurios ribojo lošėjus be pagrindo savo taisyklėse.
          </p>
        </div>

        <ol className="mt-12 grid gap-8 lg:grid-cols-2">
          {RULINGS.map((ruling) => (
            <li key={ruling.date} className="border-t-2 border-ink pt-5">
              <p className="flex items-baseline justify-between gap-4">
                <span className="font-medium">{ruling.date}</span>
                <span className="font-display text-3xl font-bold tnum">{ruling.fine}</span>
              </p>
              <p className="mt-3">{ruling.text}</p>
              <a
                href={ruling.href}
                className="mt-3 inline-block text-[0.95rem] underline decoration-line underline-offset-4 hover:decoration-ink"
                rel="noopener"
              >
                Teismo pranešimas
              </a>
            </li>
          ))}
        </ol>

        <p className="mt-12 max-w-[40rem] text-mist">
          Tai nereiškia, kad limitų nebelieka: kontoros vis dar nustato didžiausias statymų
          sumas. Todėl kiekvienai kontorai gali įrašyti savo limitą, o siūloma suma prie jo
          prisitaiko.
        </p>
      </div>
    </section>
  )
}
