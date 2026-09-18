'use client'

import { RefreshCw } from 'lucide-react'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { useEffect, useId, useRef, useState } from 'react'
import { formatEuro, formatInteger, ltPlural } from '@/lib/format-lt'
import type { Simulation } from '@/lib/simulate'

const HEIGHT = 280
const PAD = { top: 16, right: 16, bottom: 30, left: 60 }

export const signedWhole = (value: number) =>
  `${value >= 0.5 ? '+' : value <= -0.5 ? '−' : ''}${formatEuro(Math.abs(Math.round(value)))}`

function niceTicks(lo: number, hi: number): number[] {
  const raw = Math.max(1, hi - lo) / 3
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v))
  return out
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(640)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/**
 * Every scenario as a thin line, green when it ended above zero and red when
 * below, with the typical scenario drawn on top. The paths reveal left to
 * right once per new simulation.
 */
const RUN_MS = 2600

/** Draws the run from 0 to 1 once per simulation; 1 immediately in calm motion. */
function useRun(key: string | number, calm: boolean) {
  const [progress, setProgress] = useState(1)
  useEffect(() => {
    if (calm) {
      setProgress(1)
      return
    }
    let frame = 0
    const start = performance.now()
    const step = (now: number) => {
      // Ease out, so the first hundred bets fly and the ending settles.
      const t = Math.min(1, (now - start) / RUN_MS)
      setProgress(1 - (1 - t) ** 3)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    setProgress(0)
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [key, calm])
  return progress
}

export function ScenarioChart({
  simulation,
  betsLabel,
  onRerun,
}: {
  simulation: Simulation
  betsLabel?: string
  /** Shown as "Dar kartą": runs the scenarios again with new luck. */
  onRerun?: () => void
}) {
  const reduced = useReducedMotion()
  const clipId = useId().replace(/:/g, '')
  const [ref, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  const { checkpoints, paths, typical } = simulation
  const last = checkpoints.length - 1
  const values = paths.flat()
  const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values))
  const lo = Math.min(0, ...values, ...ticks)
  const hi = Math.max(0, ...values, ...ticks)
  const plotW = Math.max(40, width - PAD.left - PAD.right)
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (i / last) * plotW
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * plotH
  const d = (path: number[]) => path.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const totalBets = checkpoints[last]

  const progress = useRun(`${totalBets}-${simulation.median}-${paths.length}`, reduced)
  const running = progress < 1
  const head = Math.max(0, Math.min(last, Math.round(progress * last)))
  const betsDone = checkpoints[head]

  const column = active === null ? null : paths.map((path) => path[active]).sort((a, b) => a - b)
  const band = column ? { low: column[Math.round(0.05 * (column.length - 1))], high: column[Math.round(0.95 * (column.length - 1))] } : null

  function pick(clientX: number, element: Element) {
    const box = element.getBoundingClientRect()
    setActive(Math.max(0, Math.min(last, Math.round(((clientX - box.left - PAD.left) / plotW) * last))))
  }

  const summary = `${paths.length} scenarijų po ${formatInteger(totalBets)} statymų: tipiškas rezultatas ${signedWhole(simulation.median)}, blogiausi 5 % iki ${signedWhole(simulation.p5)}, geriausi 5 % nuo ${signedWhole(simulation.p95)}, minuse baigiasi ${Math.round(simulation.shareNegative * 100)} %.`

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="flex items-center gap-2.5 text-[0.9rem] text-haze" aria-live="polite">
          <span className="relative flex size-2">
            {running && <span className="absolute inline-flex size-full animate-[kr-ring_1.4s_ease-out_infinite] rounded-full bg-floodlight" />}
            <span className="relative inline-flex size-2 rounded-full bg-floodlight" />
          </span>
          {running ? (
            <>
              Simuliuojam… <span className="font-semibold text-chalk tnum">{formatInteger(betsDone)}</span> / {formatInteger(totalBets)} statymų
            </>
          ) : (
            <>
              {paths.length} scenarijų · tipiškas <span className="font-semibold text-chalk tnum">{signedWhole(simulation.median)}</span>
            </>
          )}
        </p>
        {onRerun && (
          <button
            type="button"
            onClick={onRerun}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-rail px-4 text-[0.9rem] font-medium transition-colors hover:bg-rail-strong"
          >
            <RefreshCw className="size-4" aria-hidden />
            Dar kartą
          </button>
        )}
      </div>
      <div
        ref={ref}
        tabIndex={0}
        role="group"
        aria-label={`${summary} Rodyklėmis peržiūrėk.`}
        className="relative outline-none focus-visible:rounded-lg focus-visible:shadow-[0_0_0_2px_var(--chalk)]"
        onFocus={() => setActive(last)}
        onBlur={() => setActive(null)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
          event.preventDefault()
          setActive((current) => Math.max(0, Math.min(last, (current ?? last) + (event.key === 'ArrowLeft' ? -1 : 1))))
        }}
      >
        <svg width={width} height={HEIGHT} className="block max-w-full" aria-hidden>
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={0} height={HEIGHT} width={PAD.left + plotW * progress} />
            </clipPath>
          </defs>
          {ticks.map((value) => (
            <g key={value}>
              <line x1={PAD.left} x2={PAD.left + plotW} y1={y(value)} y2={y(value)} stroke={value === 0 ? 'var(--rail-strong)' : 'var(--rail)'} strokeWidth={1} />
              <text x={PAD.left - 8} y={y(value)} dy="0.32em" textAnchor="end" className="fill-haze-dim text-[0.75rem] tabular-nums">
                {value === 0 ? '0' : signedWhole(value)}
              </text>
            </g>
          ))}
          <g clipPath={`url(#${clipId})`}>
            {paths.map((path, index) => (
              <path
                key={index}
                d={d(path)}
                fill="none"
                stroke={path[last] < 0 ? 'var(--scenario-down)' : 'var(--scenario-up)'}
                strokeOpacity={0.35}
                strokeWidth={1}
                strokeDasharray={path[last] < 0 ? '4 3' : undefined}
              />
            ))}
            <path d={d(typical)} fill="none" stroke="var(--chalk)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          </g>
          <circle cx={x(head)} cy={y(typical[head])} r={running ? 5.5 : 4.5} fill="var(--chalk)" stroke="var(--stand)" strokeWidth={2} />
          {running && <circle cx={x(head)} cy={y(typical[head])} r={11} fill="none" stroke="var(--chalk)" strokeOpacity={0.35} strokeWidth={1.5} />}
          <text x={PAD.left} y={HEIGHT - 8} className="fill-haze-dim text-[0.75rem]">
            0
          </text>
          <text x={PAD.left + plotW} y={HEIGHT - 8} textAnchor="end" className="fill-haze-dim text-[0.75rem]">
            {betsLabel ?? `${formatInteger(totalBets)} ${ltPlural(totalBets, 'statymas', 'statymai', 'statymų')}`}
          </text>
          {active !== null && (
            <g>
              <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--haze-dim)" strokeWidth={1} />
              <circle cx={x(active)} cy={y(typical[active])} r={4} fill="var(--chalk)" stroke="var(--stand)" strokeWidth={2} />
            </g>
          )}
          <rect
            x={PAD.left}
            y={0}
            width={plotW}
            height={HEIGHT}
            fill="transparent"
            onPointerMove={(event) => pick(event.clientX, event.currentTarget.ownerSVGElement ?? event.currentTarget)}
            onPointerDown={(event) => pick(event.clientX, event.currentTarget.ownerSVGElement ?? event.currentTarget)}
            onPointerLeave={() => setActive(null)}
          />
        </svg>

        {active !== null && band && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-[12rem] rounded-xl bg-night-deep px-3.5 py-3 text-[0.85rem] shadow-[0_12px_30px_-10px_rgb(0_0_0/0.8)] hairline"
            style={x(active) > width / 2 ? { right: width - x(active) + 12 } : { left: x(active) + 12 }}
          >
            <p className="text-haze">
              Po {formatInteger(checkpoints[active])} {ltPlural(checkpoints[active], 'statymo', 'statymų', 'statymų')}
            </p>
            <p className="mt-1.5 flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-haze">
                <span aria-hidden className="h-0.5 w-3.5 rounded bg-chalk" />
                Tipiškas
              </span>
              <span className="font-semibold">{signedWhole(typical[active])}</span>
            </p>
            <p className="mt-1 text-haze-dim">
              9 iš 10: {signedWhole(band.low)} … {signedWhole(band.high)}
            </p>
          </div>
        )}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[0.85rem] text-haze" aria-label="Legenda">
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-4 rounded bg-chalk" />
          Tipiškas scenarijus
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-4 rounded" style={{ background: 'var(--scenario-up)' }} />
          Baigėsi pliuse
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="w-4 border-t-2 border-dashed" style={{ borderColor: 'var(--scenario-down)' }} />
          Baigėsi minuse
        </li>
      </ul>
    </div>
  )
}
