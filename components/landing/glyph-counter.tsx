'use client'

import { useEffect, useRef, useState } from 'react'
import { brand } from '@/lib/brand'
import { formatEuro } from '@/lib/format-lt'
import { EURO_PER_SECOND } from '@/lib/lpt'

/** Euros earned after `ms`, stepped once a second so the glyphs can settle between changes. */
function eurosAfter(ms: number): number {
  return Math.floor(ms / 1000) * EURO_PER_SECOND
}

const COUNTER_MS = 7000
const NAME_MS = 3200
// Widest string the counter is sized for, so the glyphs don't shrink as it grows.
const SIZING_TEMPLATE = '0 000,00 €'

type Particle = { x: number; y: number; tx: number; ty: number; alpha: number; ta: number }

function sampleText(
  text: string,
  width: number,
  height: number,
  gap: number,
  fontFamily: string,
): Array<[number, number]> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []

  ctx.font = `800 100px ${fontFamily}`
  const templateWidth = Math.max(
    ctx.measureText(SIZING_TEMPLATE).width,
    ctx.measureText(brand.name).width,
  )
  const size = Math.min((100 * width * 0.96) / templateWidth, height * 0.92)
  ctx.font = `800 ${size}px ${fontFamily}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#000'
  ctx.fillText(text, 0, height / 2)

  const { data } = ctx.getImageData(0, 0, width, height)
  const points: Array<[number, number]> = []
  for (let x = 0; x < width; x += gap) {
    for (let y = 0; y < height; y += gap) {
      if (data[(y * width + x) * 4 + 3] > 128) points.push([x, y])
    }
  }
  return points
}

export function GlyphCounter() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [euros, setEuros] = useState(0)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const onChange = () => setReducedMotion(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  // Screen-reader and reduced-motion value, refreshed once a second.
  useEffect(() => {
    const openedAt = performance.now()
    const timer = window.setInterval(() => {
      setEuros(eurosAfter(performance.now() - openedAt))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (reducedMotion) return
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!wrap || !canvas || !ctx) return

    const fontFamily =
      getComputedStyle(document.documentElement).getPropertyValue('--font-display-face').trim() ||
      'Arial Narrow, sans-serif'
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--floodlight').trim()
    const chalk = getComputedStyle(document.documentElement).getPropertyValue('--chalk').trim()

    const openedAt = performance.now()
    let particles: Particle[] = []
    let width = 0
    let height = 0
    let gap = 5
    let lastText = ''
    let frame = 0
    let visible = true
    let cancelled = false

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.round(wrap.clientWidth)
      height = Math.round(width * (width < 640 ? 0.3 : 0.28))
      gap = Math.max(4, Math.round(width / 230))
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      lastText = ''
    }

    const retarget = (text: string) => {
      const points = sampleText(text, width, height, gap, fontFamily)
      const next: Particle[] = []
      for (let i = 0; i < points.length; i++) {
        const [tx, ty] = points[i]
        const existing = particles[i]
        if (existing) {
          next.push({ ...existing, tx, ty, ta: 1 })
        } else {
          const from = particles.length ? particles[(i * 7) % particles.length] : null
          next.push({
            x: from ? from.x : tx + (Math.random() - 0.5) * width * 0.3,
            y: from ? from.y : ty + (Math.random() - 0.5) * height,
            tx,
            ty,
            alpha: 0,
            ta: 1,
          })
        }
      }
      // Surplus particles fade out where they are.
      for (let i = points.length; i < particles.length; i++) {
        const p = particles[i]
        if (p.alpha > 0.02) next.push({ ...p, tx: p.x, ty: p.y, ta: 0 })
      }
      particles = next
    }

    const draw = (now: number) => {
      if (cancelled) return
      frame = requestAnimationFrame(draw)
      if (!visible || width === 0) return

      const elapsed = now - openedAt
      const inCycle = elapsed % (COUNTER_MS + NAME_MS)
      const showName = elapsed > COUNTER_MS && inCycle >= COUNTER_MS
      const text = showName ? brand.name : formatEuro(eurosAfter(elapsed), 2)

      if (text !== lastText) {
        retarget(text)
        lastText = text
      }

      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = showName ? accent : chalk
      const size = Math.max(2, gap * 0.72)
      for (const p of particles) {
        p.x += (p.tx - p.x) * 0.14
        p.y += (p.ty - p.y) * 0.14
        p.alpha += (p.ta - p.alpha) * 0.12
        if (p.alpha < 0.02) continue
        ctx.globalAlpha = p.alpha
        ctx.fillRect(p.x, p.y, size, size)
      }
      ctx.globalAlpha = 1
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    })
    observer.observe(wrap)
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(wrap)

    document.fonts.load(`800 100px ${fontFamily}`).finally(() => {
      if (cancelled) return
      resize()
      frame = requestAnimationFrame(draw)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      resizeObserver.disconnect()
    }
  }, [reducedMotion])

  return (
    <div ref={wrapRef} className="w-full">
      {reducedMotion ? (
        <p className="font-display text-[clamp(3.5rem,16vw,13rem)] leading-none font-extrabold text-chalk tnum">
          {formatEuro(euros, 2)}
        </p>
      ) : (
        <canvas ref={canvasRef} aria-hidden className="block w-full" />
      )}
      <p className="sr-only" aria-live="off">
        {formatEuro(euros, 2)}
      </p>
    </div>
  )
}
