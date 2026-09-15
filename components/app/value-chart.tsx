'use client'

import { useEffect, useRef, useState } from 'react'
import type { ValuePoint } from '@/lib/bet-value'
import { formatEuro, ltPlural } from '@/lib/format-lt'

const HEIGHT = 240
const PAD = { top: 14, right: 16, bottom: 30, left: 52 }

export const signedEuro = (value: number) =>
  `${value > 0.004 ? '+' : value < -0.004 ? '−' : ''}${formatEuro(Math.abs(value), 2)}`

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

/** Clean tick values: zero plus one rounded step above and below where the data reaches. */
function ticks(lo: number, hi: number): number[] {
  const span = Math.max(1, hi - lo)
  const raw = span / 3
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 100) / 100)
  return out
}

/**
 * Running result against running value, with the band the result stays in
 * about 95 % of the time. One member series plus a reference line, so the
 * lines differ by stroke (solid / dashed) and the legend, not by hue alone.
 */
export function ValueChart({ points }: { points: ValuePoint[] }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  const last = points.length - 1
  const lows = points.map((p) => Math.min(p.result, p.value - p.spread))
  const highs = points.map((p) => Math.max(p.result, p.value + p.spread))
  const tickValues = ticks(Math.min(0, ...lows), Math.max(0, ...highs))
  const lo = Math.min(0, ...lows, ...tickValues)
  const hi = Math.max(0, ...highs, ...tickValues)
  const plotW = Math.max(40, width - PAD.left - PAD.right)
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (last > 0 ? i / last : 0.5) * plotW
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * plotH

  const line = (pick: (p: ValuePoint) => number) => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(pick(p)).toFixed(1)}`).join(' ')
  const band = `${line((p) => p.value + p.spread)} ${[...points]
    .map((p, i) => ({ p, i }))
    .reverse()
    .map(({ p, i }) => `L${x(i).toFixed(1)},${y(p.value - p.spread).toFixed(1)}`)
    .join(' ')} Z`

  const shown = active ?? null
  const point = shown === null ? null : points[shown]

  function pick(clientX: number, element: Element) {
    const box = element.getBoundingClientRect()
    const ratio = (clientX - box.left - PAD.left) / plotW
    setActive(Math.max(0, Math.min(last, Math.round(ratio * last))))
  }

  const end = points[last]

  return (
    <div>
      <div
        ref={ref}
        className="relative outline-none focus-visible:rounded-lg focus-visible:shadow-[0_0_0_2px_var(--chalk)]"
        tabIndex={0}
        role="group"
        aria-label={`Rezultatas ${signedEuro(end.result)}, vertė ${signedEuro(end.value)} po ${last} ${ltPlural(last, 'statymo', 'statymų', 'statymų')}. Rodyklėmis peržiūrėk kiekvieną statymą.`}
        onFocus={() => setActive(last)}
        onBlur={() => setActive(null)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
          event.preventDefault()
          setActive((current) => Math.max(0, Math.min(last, (current ?? last) + (event.key === 'ArrowLeft' ? -1 : 1))))
        }}
      >
        <svg width={width} height={HEIGHT} className="block max-w-full" aria-hidden>
          {tickValues.map((value) => (
            <g key={value}>
              <line x1={PAD.left} x2={PAD.left + plotW} y1={y(value)} y2={y(value)} stroke={value === 0 ? 'var(--rail-strong)' : 'var(--rail)'} strokeWidth={1} />
              <text x={PAD.left - 8} y={y(value)} dy="0.32em" textAnchor="end" className="fill-haze-dim text-[0.75rem] tabular-nums">
                {value === 0 ? '0' : signedEuro(value).replace(',00', '')}
              </text>
            </g>
          ))}
          <path d={band} fill="var(--chalk)" fillOpacity={0.07} />
          <path d={line((p) => p.value)} fill="none" stroke="var(--haze)" strokeWidth={2} strokeDasharray="5 5" strokeLinecap="round" />
          <path d={line((p) => p.result)} fill="none" stroke="var(--chalk)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(last)} cy={y(end.result)} r={4} fill="var(--chalk)" stroke="var(--stand)" strokeWidth={2} />
          <text x={PAD.left} y={HEIGHT - 8} className="fill-haze-dim text-[0.75rem]">
            0
          </text>
          <text x={PAD.left + plotW} y={HEIGHT - 8} textAnchor="end" className="fill-haze-dim text-[0.75rem]">
            {last} {ltPlural(last, 'statymas', 'statymai', 'statymų')}
          </text>
          {point && shown !== null && (
            <g>
              <line x1={x(shown)} x2={x(shown)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--haze-dim)" strokeWidth={1} />
              <circle cx={x(shown)} cy={y(point.result)} r={4} fill="var(--chalk)" stroke="var(--stand)" strokeWidth={2} />
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

        {point && shown !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-[11.5rem] rounded-xl bg-night-deep px-3.5 py-3 text-[0.85rem] shadow-[0_12px_30px_-10px_rgb(0_0_0/0.8)] hairline"
            style={x(shown) > width / 2 ? { right: width - x(shown) + 12 } : { left: x(shown) + 12 }}
          >
            <p className="text-haze">{shown === 0 ? 'Pradžia' : `Po ${shown} ${ltPlural(shown, 'statymo', 'statymų', 'statymų')}`}</p>
            <p className="mt-1.5 flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-haze">
                <span aria-hidden className="h-0.5 w-3.5 rounded bg-chalk" />
                Rezultatas
              </span>
              <span className="font-semibold">{signedEuro(point.result)}</span>
            </p>
            <p className="mt-1 flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-haze">
                <span aria-hidden className="h-0 w-3.5 border-t-2 border-dashed border-haze" />
                Vertė
              </span>
              <span className="font-semibold">{signedEuro(point.value)}</span>
            </p>
            <p className="mt-1 text-haze-dim">
              Įprasta: {signedEuro(point.value - point.spread)} … {signedEuro(point.value + point.spread)}
            </p>
          </div>
        )}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[0.85rem] text-haze" aria-label="Legenda">
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-4 rounded bg-chalk" />
          Tavo rezultatas
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="w-4 border-t-2 border-dashed border-haze" />
          Vertė
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-4 rounded-sm bg-chalk/10" />
          Įprastas svyravimas (apie 95 %)
        </li>
      </ul>
    </div>
  )
}
