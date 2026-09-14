import Link from 'next/link'

export function FinalCta() {
  return (
    <section className="border-t border-rail">
      <div className="mx-auto flex max-w-[80rem] flex-col items-start gap-8 px-5 py-24 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:py-28">
        <h2 className="max-w-[46rem] text-[3rem] sm:text-[4.5rem]">
          Kitą kartą, kai kontora suklys, būk ten
        </h2>
        <div>
          <Link
            href="/registracija"
            className="inline-block rounded-xl bg-chalk px-7 py-4 text-[1.05rem] font-semibold text-night transition-transform duration-200 hover:bg-white active:scale-[0.97]"
          >
            Išbandyti 7 dienas nemokamai
          </Link>
          <p className="mt-3 text-[0.9rem] text-haze-dim">Kortelės nereikia.</p>
        </div>
      </div>
    </section>
  )
}
