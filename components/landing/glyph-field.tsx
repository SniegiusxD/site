'use client'

import { useEffect, useRef } from 'react'
import { brand } from '@/lib/brand'
import { formatInteger } from '@/lib/format-lt'
import { EURO_PER_SECOND } from '@/lib/lpt'
import { useReducedMotion } from '@/lib/use-reduced-motion'

const GLYPHS = '0123456789€+.KRAŠTAS'
const NUMBER_MS = 6000
const BRAND_MS = 2500
const FRAME_MS = 33

const clockParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Vilnius',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** Euros Lithuanian remote bookmakers earned since Vilnius midnight, at the Q1 2026 average rate. */
export function earnedToday(now = new Date()): number {
  const parts = clockParts.formatToParts(now)
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0)
  return (part('hour') * 3600 + part('minute') * 60 + part('second')) * EURO_PER_SECOND
}

type Cell = { x: number; y: number; glyph: number; base: number; value: number; target: number; distance: number; accent: boolean }

/**
 * The footer signature: a field of small glyphs that forms today's number, morphs into
 * the brand name, and back. Pre-rendered glyph sprites keep it cheap; it runs at 30 fps
 * only while on screen, and a reduced-motion visitor gets a still frame updated each second.
 */
export function GlyphField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const readout = useRef<HTMLParagraphElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const mask = document.createElement('canvas')
    const maskContext = mask.getContext('2d', { willReadFrequently: true })
    if (!maskContext) return

    const rootStyle = getComputedStyle(document.documentElement)
    const displayFace = rootStyle.getPropertyValue('--font-display-face').trim() || 'sans-serif'
    const textFace = getComputedStyle(document.body).fontFamily
    const brandText = brand.name.toLocaleUpperCase('lt-LT')
    const lowPower = (navigator.hardwareConcurrency || 8) < 4

    let cells: Cell[] = []
    let cols = 0
    let rows = 0
    let cell = 10
    let ratio = 1
    let mode: 'number' | 'brand' = 'number'
    let shownText = ''
    let pointer: { x: number; y: number } | null = null
    let running = false
    let last = 0
    let frame = 0
    let swapTimer = 0
    let sprites: Record<'chalk' | 'spring' | 'haze', HTMLCanvasElement[]> = { chalk: [], spring: [], haze: [] }

    const numberText = () => `${formatInteger(earnedToday())} €`

    const buildSprites = () => {
      const colours = { chalk: '#EAF6EE', spring: '#5BE584', haze: '#A9C9B8' } as const
      const size = Math.ceil(cell * ratio)
      sprites = { chalk: [], spring: [], haze: [] }
      for (const [name, colour] of Object.entries(colours) as Array<[keyof typeof colours, string]>) {
        for (const glyph of GLYPHS) {
          const sprite = document.createElement('canvas')
          sprite.width = size
          sprite.height = size
          const spriteContext = sprite.getContext('2d')!
          spriteContext.fillStyle = colour
          spriteContext.textAlign = 'center'
          spriteContext.textBaseline = 'middle'
          spriteContext.font = `600 ${Math.round((cell - 1) * ratio)}px ${textFace}`
          spriteContext.fillText(glyph, size / 2, size / 2 + ratio * 0.5)
          sprites[name].push(sprite)
        }
      }
    }

    const layout = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (!width || !height) return false
      ratio = Math.min(2, window.devicePixelRatio || 1)
      // Bigger cells than a plain noise field: the digits have to be readable first.
      // Phones get smaller cells: the number has to fit across a narrow field.
      cell = width < 640 ? 6 : 11
      cols = Math.floor(width / cell)
      rows = Math.floor(height / cell)
      const cap = width < 640 ? 4200 : 11000
      while (cols * rows > cap) {
        cell += 1
        cols = Math.floor(width / cell)
        rows = Math.floor(height / cell)
      }
      // A field smaller than one cell has nothing to draw (and getImageData throws on 0).
      if (!cols || !rows) return false
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      mask.width = cols
      mask.height = rows
      const centreX = cols / 2
      const centreY = rows / 2
      const farthest = Math.hypot(centreX, centreY)
      cells = []
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          cells.push({
            x,
            y,
            glyph: Math.floor(Math.random() * GLYPHS.length),
            base: 0.35 + Math.random() * 0.35,
            value: 0,
            target: 0,
            distance: Math.hypot(x - centreX, y - centreY) / farthest,
            accent: Math.random() < 0.22,
          })
        }
      }
      buildSprites()
      shownText = ''
      return true
    }

    const setTarget = (text: string) => {
      if (!cols || !rows) return
      maskContext.setTransform(1, 0, 0, 1, 0, 0)
      maskContext.clearRect(0, 0, cols, rows)
      maskContext.fillStyle = '#fff'
      maskContext.textAlign = 'center'
      maskContext.textBaseline = 'middle'
      // A phone-wide field is too few cells for eight characters in a row: the
      // digits dissolve into noise. There the currency sign takes a line of its own.
      const lines = cols < 90 && text.endsWith(' €') ? [text.slice(0, -2), '€'] : [text]
      let size = (rows * 0.8) / lines.length
      maskContext.font = `800 ${size}px ${displayFace}`
      const measured = Math.max(...lines.map((line) => maskContext.measureText(line).width)) || 1
      if (measured > cols * 0.92) {
        size *= (cols * 0.92) / measured
        maskContext.font = `800 ${size}px ${displayFace}`
      }
      const lineHeight = size * 0.95
      lines.forEach((line, index) => {
        const offset = (index - (lines.length - 1) / 2) * lineHeight
        maskContext.fillText(line, cols / 2, rows / 2 + offset + size * 0.04)
      })
      const pixels = maskContext.getImageData(0, 0, cols, rows).data
      for (const item of cells) {
        // Hard edges: a soft gradient over one cell reads as noise, not as a digit.
        const alpha = pixels[(item.y * cols + item.x) * 4 + 3] / 255
        item.target = alpha > 0.55 ? 1 : alpha > 0.3 ? 0.6 : 0
      }
      shownText = text
    }

    const render = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      context.clearRect(0, 0, width, height)
      for (const item of cells) {
        const inside = item.value > 0.3
        // Outside the shape only every sixth cell is drawn, very dimly, so the number reads.
        if (!inside && (item.x * 7 + item.y * 13) % 6 !== 0) continue
        let px = item.x * cell
        let py = item.y * cell
        let alpha = inside ? 0.7 + item.value * 0.3 : item.base * 0.16
        if (pointer) {
          const dx = px - pointer.x
          const dy = py - pointer.y
          const distance = Math.hypot(dx, dy)
          if (distance < 120) {
            const force = 1 - distance / 120
            px += (dx / (distance || 1)) * force * 14
            py += (dy / (distance || 1)) * force * 14
            alpha = Math.min(1, alpha * (1 + force * 0.8))
          }
        }
        const set = inside ? (item.accent ? sprites.spring : sprites.chalk) : sprites.haze
        if (inside) {
          // A faint block behind the glyph welds the cells into a readable digit.
          context.globalAlpha = 0.1 * item.value
          context.fillStyle = '#EAF6EE'
          context.fillRect(px, py, cell, cell)
        }
        context.globalAlpha = alpha
        context.drawImage(set[item.glyph], px, py, cell, cell)
      }
      context.globalAlpha = 1
    }

    const paintNow = () => {
      if (!cells.length && !layout()) return
      setTarget(mode === 'number' ? numberText() : brandText)
      for (const item of cells) item.value = item.target
      render()
      if (readout.current) readout.current.textContent = numberText()
    }

    const tick = (now: number) => {
      if (!running) return
      frame = window.requestAnimationFrame(tick)
      if (now - last < FRAME_MS) return
      last = now
      const want = mode === 'number' ? numberText() : brandText
      if (want !== shownText) setTarget(want)
      for (const item of cells) item.value += (item.target - item.value) * (0.06 + 0.08 * (1 - item.distance))
      render()
      if (readout.current && readout.current.textContent !== numberText()) readout.current.textContent = numberText()
    }

    const start = () => {
      if (running) return
      running = true
      last = 0
      frame = window.requestAnimationFrame(tick)
    }
    const stop = () => {
      running = false
      window.cancelAnimationFrame(frame)
    }

    const cleanups: Array<() => void> = []
    const ready = () => {
      if (!layout()) return
      paintNow()
      if (reduced || lowPower) {
        const timer = window.setInterval(paintNow, 1000)
        cleanups.push(() => window.clearInterval(timer))
        return
      }
      const swap = () => {
        mode = mode === 'number' ? 'brand' : 'number'
        swapTimer = window.setTimeout(swap, mode === 'brand' ? BRAND_MS : NUMBER_MS)
      }
      swapTimer = window.setTimeout(swap, NUMBER_MS)
      cleanups.push(() => window.clearTimeout(swapTimer))
      const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()))
      observer.observe(canvas)
      cleanups.push(() => observer.disconnect())
    }

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        pointer = null
        return
      }
      const box = canvas.getBoundingClientRect()
      pointer = { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onLeave = () => {
      pointer = null
    }
    const onResize = () => {
      if (layout()) paintNow()
    }
    canvas.addEventListener('pointermove', onPointer)
    canvas.addEventListener('pointerleave', onLeave)
    window.addEventListener('resize', onResize)

    // Wait for the display face so the number and the name use the real letterforms.
    let cancelled = false
    ;(document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (!cancelled) ready()
    })

    return () => {
      cancelled = true
      stop()
      cleanups.forEach((cleanup) => cleanup())
      canvas.removeEventListener('pointermove', onPointer)
      canvas.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', onResize)
    }
  }, [reduced])

  return (
    <>
      <canvas ref={canvasRef} aria-hidden className="block h-[clamp(280px,28vw,380px)] w-full" />
      <p ref={readout} className="sr-only" />
    </>
  )
}
