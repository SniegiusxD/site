'use client'

import { useEffect, useRef, useState } from 'react'

/*
 * Adapted from the 21st.dev component "laser focus" by jorgevarelarz (retrieved
 * 2026-09-15): a raw WebGL shader of light beams fanning from a focal point.
 * Reworked into stadium floodlights for this site: two light towers above the
 * corners of the hero aim slowly swaying cones at the pitch, warm floodlight
 * at the source fading to chalk. Kept dim so the headline stays readable.
 *
 * Performance rules, because this sits behind the largest paint:
 * - starts only after the page is idle, and fades in;
 * - renders at 60 % resolution, at most 30 frames a second;
 * - pauses when scrolled out of view or the tab is hidden;
 * - one still frame for reduced motion; nothing at all without WebGL
 *   (the CSS floodlight wash underneath stays as the fallback).
 */

const VERT = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const FRAG = `
precision mediump float;
uniform float uTime;
uniform vec2 uRes;
varying vec2 vUv;

const vec3 WARM = vec3(1.0, 0.84, 0.30);
const vec3 COOL = vec3(0.93, 0.95, 0.97);

float beam(vec2 p, float ang, float width) {
  vec2 dir = vec2(cos(ang), sin(ang));
  float fwd = dot(p, dir);
  if (fwd <= 0.0) return 0.0;
  float d = abs(p.x * dir.y - p.y * dir.x);
  float spread = width * (0.35 + fwd * 1.7);
  return smoothstep(spread, 0.0, d) / (1.0 + fwd * fwd * 2.4);
}

float tower(vec2 uv, vec2 origin, float aim, float t, float side) {
  vec2 p = uv - origin;
  p.x *= uRes.x / uRes.y;
  float acc = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float ang = aim + side * (fi - 1.5) * 0.10 + sin(t + fi * 1.9) * 0.05;
    acc += beam(p, ang, 0.05 + 0.012 * sin(t * 1.4 + fi)) * (0.6 + 0.3 * sin(t * 1.7 + fi * 2.3));
  }
  return acc + 0.03 / (length(p) + 0.06);
}

void main() {
  float t = uTime * 0.2;
  float light = tower(vUv, vec2(0.08, 1.06), -1.5708 + 0.62, t, 1.0)
              + tower(vUv, vec2(0.92, 1.06), -1.5708 - 0.62, t + 2.1, -1.0);
  vec3 col = mix(COOL, WARM, clamp(vUv.y * 0.95, 0.0, 1.0));
  float alpha = clamp(light * 0.2, 0.0, 0.3) * smoothstep(0.02, 0.6, vUv.y);
  gl_FragColor = vec4(col * alpha, alpha);
}
`

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export function FloodlightBeams({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let cancelled = false
    let cleanup = () => {}

    const start = () => {
      if (cancelled) return
      const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true })
      if (!gl) return
      const vs = compile(gl, gl.VERTEX_SHADER, VERT)
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
      if (!vs || !fs) return
      const program = gl.createProgram()!
      gl.attachShader(program, vs)
      gl.attachShader(program, fs)
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
      gl.useProgram(program)

      const buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
      const position = gl.getAttribLocation(program, 'position')
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
      const uTime = gl.getUniformLocation(program, 'uTime')
      const uRes = gl.getUniformLocation(program, 'uRes')

      const resize = () => {
        const scale = 0.6
        canvas.width = Math.max(1, Math.floor(canvas.clientWidth * scale))
        canvas.height = Math.max(1, Math.floor(canvas.clientHeight * scale))
        gl.viewport(0, 0, canvas.width, canvas.height)
        gl.uniform2f(uRes, canvas.width, canvas.height)
      }
      resize()
      const resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(canvas)

      const draw = (seconds: number) => {
        gl.uniform1f(uTime, seconds)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
      }

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      let frame = 0
      let visible = true
      let last = 0
      const began = performance.now()
      const loop = (now: number) => {
        frame = requestAnimationFrame(loop)
        if (!visible || document.hidden || now - last < 33) return
        last = now
        draw((now - began) / 1000 + 4)
      }

      draw(6)
      setShown(true)
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting
      })
      observer.observe(canvas)
      if (!reduced) frame = requestAnimationFrame(loop)

      cleanup = () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
        resizeObserver.disconnect()
        gl.deleteProgram(program)
        gl.deleteShader(vs)
        gl.deleteShader(fs)
        gl.deleteBuffer(buffer)
      }
    }

    // Wait until the page has painted and settled so the hero text paints first.
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback
    const timer = idle ? idle(start, { timeout: 1500 }) : window.setTimeout(start, 700)

    return () => {
      cancelled = true
      if (!idle) window.clearTimeout(timer)
      cleanup()
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`pointer-events-none transition-opacity duration-[1600ms] ease-out ${shown ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  )
}
