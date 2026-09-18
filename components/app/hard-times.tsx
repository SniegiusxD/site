'use client'

import { useId, useMemo, useState } from 'react'
import { formatInteger, formatPercent } from '@/lib/format-lt'
import { losingStreakOdds, simulate } from '@/lib/simulate'
import { signedWhole } from './scenario-chart'

/**
 * Answers to the moments people quit, computed from the same resampled
 * history as the scenarios, so the numbers match the chart above them.
 */
export function HardTimes({ returns, stake, dailyBets }: { returns: number[]; stake: number; dailyBets: number }) {
  const titleId = useId()
  const [open, setOpen] = useState<number | null>(null)
  const month = dailyBets * 30

  const facts = useMemo(
    () => ({
      streak: losingStreakOdds({ returns, stake, bets: month, streak: 10, paths: 200, seed: 20 }),
      week: simulate({ returns, stake, bets: dailyBets * 7, paths: 400, seed: 21, points: 7 }),
      month: simulate({ returns, stake, bets: month, paths: 400, seed: 22, points: 10 }),
      thousand: simulate({ returns, stake, bets: 1000, paths: 400, seed: 23, points: 10 }),
    }),
    [returns, stake, dailyBets, month],
  )

  const cards = [
    {
      title: 'Pralaimėjau 10 iš eilės',
      answer: `Per mėnesį (${formatInteger(month)} statymų) tokia serija pasitaiko ${formatPercent(facts.streak.share, 0)} scenarijų.${
        facts.streak.medianWithStreak !== null ? ` Jų vidurys mėnesio gale: ${signedWhole(facts.streak.medianWithStreak)}.` : ''
      }`,
      advice: 'Serija nekeičia kainų vertės. Statyk toliau tomis pačiomis sumomis.',
    },
    {
      title: 'Savaitė minuse',
      answer: `Minuse baigiasi ${formatPercent(facts.week.shareNegative, 0)} savaičių ir ${formatPercent(facts.month.shareNegative, 0)} mėnesių.`,
      advice: 'Vertink šimtais statymų, ne dienomis ar savaitėmis.',
    },
    {
      title: 'Po 1 000 statymų vis dar minuse',
      answer: `Taip baigiasi ${formatPercent(facts.thousand.shareNegative, 0)} scenarijų.`,
      advice: 'Žiūrėk į CLV statymų puslapyje: jei kainos nuolat lenkia uždarymo kainą, vertė yra, net kai rezultatas dar ne.',
    },
  ]

  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId} className="text-[1.5rem]">
        Kai bus sunku
      </h2>
      <p className="mt-1 text-[0.95rem] text-haze">Paspausk kortelę. Atsakymai skaičiuoti iš tų pačių scenarijų.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {cards.map((card, index) => {
          const on = open === index
          return (
            <button
              key={card.title}
              type="button"
              aria-expanded={on}
              onClick={() => setOpen(on ? null : index)}
              className={`rounded-2xl p-4 text-left transition-colors duration-200 ${on ? 'bg-chalk text-night' : 'bg-stand hairline hover:bg-stand-hover'}`}
            >
              <span className="block font-semibold">{card.title}</span>
              {on ? (
                <>
                  <span className="mt-2 block text-[0.95rem]">{card.answer}</span>
                  <span className="mt-2 block text-[0.95rem] font-semibold">{card.advice}</span>
                </>
              ) : (
                <span className="mt-2 block text-[0.9rem] text-haze">Ką daryti?</span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
