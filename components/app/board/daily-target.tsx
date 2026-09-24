'use client'

import NumberFlow from '@number-flow/react'
import { motion, useAnimate } from 'framer-motion'
import { Check } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { type BoardBet, dailyProgress } from '@/lib/exposure'
import { ltPlural } from '@/lib/format-lt'
import { DAILY_BET_CHOICES } from '@/lib/preferences'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { ChipGroup } from '../chip-group'
import { MonthDialog } from '../month-dialog'

const EASE = [0.22, 1, 0.36, 1] as const

/** Today's recorded bets against the member's daily target, and the way into the month view. */
export function DailyTarget({
  ref,
  bump = 0,
  bets,
  now,
  target,
  onChange,
}: {
  /** The count the "+1 statymas" pill lands on. */
  ref?: React.Ref<HTMLDivElement>
  /** Changes when a pill lands; the card answers with a small bump. */
  bump?: number
  bets: BoardBet[]
  now: Date
  target: number
  onChange: (value: number) => void
}) {
  const reduced = useReducedMotion()
  const [card, animateCard] = useAnimate()
  useEffect(() => {
    if (!bump || reduced || !card.current) return
    animateCard(card.current, { scale: [1, 1.035, 1] }, { duration: 0.42, ease: EASE })
  }, [bump, reduced, animateCard, card])
  const [editing, setEditing] = useState(false)
  const [monthOpen, setMonthOpen] = useState(false)
  const closeMonth = useCallback(() => setMonthOpen(false), [])
  const progress = useMemo(() => dailyProgress(bets, now), [bets, now])
  const reached = progress.count >= target
  const left = Math.max(0, target - progress.count)

  return (
    <div ref={card} className="mt-4 rounded-2xl bg-stand p-4 hairline">
      <div className="flex items-start justify-between gap-4">
        <div ref={ref}>
          <p className="text-[0.85rem] text-haze">Dienos tikslas</p>
          <p className="mt-1 font-display text-[1.9rem] leading-none font-bold tnum">
            <NumberFlow value={progress.count} />
            <span className="text-haze"> iš {target}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[0.85rem] text-haze">Uždirbta vertės</p>
          <p className={`mt-1 font-display text-[1.9rem] leading-none font-bold tnum ${progress.value > 0 ? 'text-pitch' : 'text-haze'}`}>
            <NumberFlow
              value={progress.value}
              locales="lt-LT"
              format={{ minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' }}
              suffix=" €"
            />
          </p>
        </div>
      </div>
      <div
        role="progressbar"
        aria-label="Šiandien pažymėti statymai"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.min(progress.count, target)}
        className="mt-3 h-2 overflow-hidden rounded-full bg-rail"
      >
        <motion.div
          className="h-full rounded-full bg-pitch"
          initial={false}
          animate={{ width: `${Math.min(1, progress.count / Math.max(1, target)) * 100}%` }}
          transition={{ duration: reduced ? 0 : 0.6, ease: EASE }}
        />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3 text-[0.85rem]">
        {reached ? (
          <p className="flex items-center gap-1 font-medium text-pitch">
            <Check className="size-4" aria-hidden />
            Tikslas pasiektas
          </p>
        ) : (
          <p className="text-haze">
            Liko {left} {ltPlural(left, 'statymas', 'statymai', 'statymų')}
          </p>
        )}
        <button
          type="button"
          aria-expanded={editing}
          onClick={() => setEditing((value) => !value)}
          className="font-medium text-chalk underline decoration-rail-strong underline-offset-4 hover:decoration-chalk"
        >
          Keisti tikslą
        </button>
        <button
          type="button"
          onClick={() => setMonthOpen(true)}
          className="font-medium text-chalk underline decoration-rail-strong underline-offset-4 hover:decoration-chalk"
        >
          Mėnuo
        </button>
      </div>
      {editing && (
        <div className="mt-3 border-t border-rail pt-3">
          <ChipGroup
            label="Kiek statymų per dieną"
            options={DAILY_BET_CHOICES.map((value): { value: number; label: string } => ({ value, label: String(value) }))}
            value={target}
            onChange={(value) => {
              onChange(value)
              setEditing(false)
            }}
          />
        </div>
      )}
      <MonthDialog open={monthOpen} onClose={closeMonth} dailyTarget={target} now={now} />
    </div>
  )
}
