'use client'

import { useEffect, useRef, useState } from 'react'
import { brand } from '@/lib/brand'
import { formatEuro } from '@/lib/format-lt'
import { EURO_PER_SECOND } from '@/lib/lpt'

const NUMBER_MS = 7000
const NAME_MS = 3600
// Widest string the field is sized for, so glyphs don't shrink as the day goes on.
const SIZING_TEMPLATE = '000 000 €'
const GLYPHS = '0123456789€%+'

const vilniusClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Vilnius',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** Average remote-betting GGR since midnight in Vilnius, stepped once a second. */
export function eurosToday(date = new Date()): number {
  const parts = vilniusClock.formatToParts(date)
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  return (get('hour') * 3600 + get('minute') * 60 + get('second')) * EURO_PER_SECOND
}

type Particle = {
  x: number
  y: number
  tx: number
  ty: number
  alpha: number
  ta: number
  speed: number
  glyph: number
  phase: number
}

function sampleText(text: string, width: number, height: number, gap: number, font: string) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []
  ctx.font = `800 100px ${font}`
  const templateWidth = Math.max(ctx.measureText(SIZING_TEMPLATE).width, ctx.measureText(brand.name).width)
  const size = Math.min((100 * width * 0.97) / templateWidth, height * 0.95)
  ctx.font = `800 ${size}px ${font}`
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 0, height / 2)
  const { data } = ctx.getImageData(0, 0, width, height)
  const points: Array<[number, number]> = []
  for (let x = 0; x < width; x += gap) {
    for (let y = 0; y < height; y += gap) {
      if (data[(y * width + x) * 4 + 3] > 140) points.push([x, y])
    }
  }
  return points
}

function makeSprites(size: number, dpr: number, font: string, color: string) {
  return [...GLYPHS].map((glyph) => {
    const canvas = document.createElement('canvas')
    const px = Math.ceil(size * dpr)
    canvas.width = px
    canvas.height = px
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = color
    ctx.font = `600 ${px * 0.92}px ${font}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(glyph, px / 2, px / 2 + px * 0.04)
    return canvas
  })
}

export function GlyphCounter() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [euros, setEuros] = useState<number | null>(null)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const onChange = () => setReducedMotion(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    setEuros(eurosToday())
    const timer = window.setInterval(() => setEuros(eurosToday()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (reducedMotion) return
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!wrap || !canvas || !ctx) return

    const root = getComputedStyle(document.documentElement)
    const displayFont = root.getPropertyValue('--font-display-face').trim() || 'Arial Narrow, sans-serif'
    const textFont = root.getPropertyValue('--font-text-face').trim() || 'system-ui, sans-serif'
    const chalk = root.getPropertyValue('--chalk').trim() || '#eef2f7'

    let particles: Particle[] = []
    let sprites: HTMLCanvasElement[] = []
    let width = 0
    let height = 0
    let gap = 6
    let glyphSize = 8
    let lastText = ''
    let formedAt: number | null = null
    let visible = false
    let frame = 0
    let cancelled = false
    let cachedSecond = -1
    let cachedNumber = ''

    const seedCloud = () => {
      const count = Math.round((width * height) / (gap * gap * 7))
      particles = Array.from({ length: count }, () => {
        // Gaussian-ish cloud centred low in the field, like dust under a floodlight.
        const r = Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * 0.42
        const angle = Math.random() * Math.PI * 2
        const x = width / 2 + Math.cos(angle) * r * width * 0.42
        const y = height * 0.6 + Math.sin(angle) * r * height * 0.9
        return {
          x,
          y,
          tx: x,
          ty: y,
          alpha: 0,
          ta: 0.1 + Math.random() * 0.35,
          speed: 0.035 + Math.random() * 0.07,
          glyph: Math.floor(Math.random() * GLYPHS.length),
          phase: Math.random() * Math.PI * 2,
        }
      })
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.round(wrap.clientWidth)
      height = Math.round(width * (width < 640 ? 0.32 : 0.26))
      gap = Math.max(5, Math.round(width / 210))
      glyphSize = gap * 1.3
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sprites = makeSprites(glyphSize, dpr, textFont, chalk)
      lastText = ''
      if (formedAt === null) seedCloud()
    }

    const retarget = (text: string) => {
      const points = sampleText(text, width, height, gap, displayFont)
      const next: Particle[] = []
      for (let i = 0; i < points.length; i++) {
        const [tx, ty] = points[i]
        const existing = particles[i]
        if (existing) {
          // Once formed, glyphs re-settle quickly so a changing digit stays legible.
          next.push({
            ...existing,
            tx,
            ty,
            ta: 0.55 + Math.random() * 0.45,
            speed: Math.max(existing.speed, 0.12 + Math.random() * 0.08),
          })
        } else {
          const from = particles.length ? particles[(i * 7) % particles.length] : null
          next.push({
            x: from ? from.x : width / 2,
            y: from ? from.y : height / 2,
            tx,
            ty,
            alpha: 0,
            ta: 0.55 + Math.random() * 0.45,
            speed: 0.05 + Math.random() * 0.08,
            glyph: Math.floor(Math.random() * GLYPHS.length),
            phase: Math.random() * Math.PI * 2,
          })
        }
      }
      for (let i = points.length; i < particles.length; i++) {
        const p = particles[i]
        if (p.alpha > 0.02) next.push({ ...p, tx: p.x, ty: p.y, ta: 0 })
      }
      particles = next
    }

    const currentText = (now: number) => {
      if (formedAt === null) return ''
      const elapsed = now - formedAt
      const inCycle = elapsed % (NUMBER_MS + NAME_MS)
      if (elapsed > NUMBER_MS && inCycle >= NUMBER_MS) return brand.name
      const second = Math.floor(Date.now() / 1000)
      if (second !== cachedSecond) {
        cachedSecond = second
        // Whole euros: at ~1.12 €/s only the last digit changes each second.
        cachedNumber = formatEuro(eurosToday())
      }
      return cachedNumber
    }

    const draw = (now: number) => {
      if (cancelled) return
      frame = requestAnimationFrame(draw)
      if (!visible || width === 0) return

      const text = currentText(now)
      if (text && text !== lastText) {
        retarget(text)
        lastText = text
      }

      ctx.clearRect(0, 0, width, height)
      const half = glyphSize / 2
      for (const p of particles) {
        if (formedAt === null) {
          // Idle cloud: a slow drift until the footer is in view.
          p.x = p.tx + Math.sin(now * 0.0005 + p.phase) * gap
          p.y = p.ty + Math.cos(now * 0.0004 + p.phase) * gap
        } else {
          p.x += (p.tx - p.x) * p.speed
          p.y += (p.ty - p.y) * p.speed
        }
        p.alpha += (p.ta - p.alpha) * 0.08
        if (Math.random() < 0.004) p.glyph = Math.floor(Math.random() * GLYPHS.length)
        if (p.alpha < 0.02) continue
        ctx.globalAlpha = p.alpha
        ctx.drawImage(sprites[p.glyph], p.x - half, p.y - half, glyphSize, glyphSize)
      }
      ctx.globalAlpha = 1
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (entry.intersectionRatio > 0.5 && formedAt === null) {
          // Hold the cloud a beat so the visitor sees it gather.
          window.setTimeout(() => {
            if (formedAt === null) formedAt = performance.now()
          }, 900)
        }
      },
      { threshold: [0, 0.5] },
    )
    observer.observe(wrap)
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(wrap)

    document.fonts.load(`800 100px ${displayFont}`).finally(() => {
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

  const label = euros === null ? '' : formatEuro(euros)

  return (
    <div ref={wrapRef} className="w-full">
      {reducedMotion ? (
        <p className="font-display text-[clamp(3.5rem,15vw,12rem)] leading-none font-extrabold tnum">{label}</p>
      ) : (
        <canvas ref={canvasRef} aria-hidden className="block w-full" />
      )}
      <p className="sr-only">{label}</p>
    </div>
  )
}
