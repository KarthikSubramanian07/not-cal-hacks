import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/lib/hooks'

/**
 * The sky.
 *
 * Three parallax depth layers on one canvas. Everything here is deliberately
 * restrained: stars are small, mostly desaturated, and drift slowly. A bright
 * twinkling field would fight the interface for attention, which is the failure
 * mode of every "space theme" on the internet.
 *
 * Cost control matters because this sits behind the whole product: one canvas,
 * no per-star DOM, the loop parks itself when the tab is hidden, and reduced
 * motion gets a single static paint instead of a frozen animation.
 */

interface Star {
  x: number
  y: number
  radius: number
  /** 0 = far, 2 = near. Drives drift speed and parallax response. */
  depth: number
  baseAlpha: number
  twinklePhase: number
  twinkleSpeed: number
  color: string
}

interface Meteor {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  length: number
}

const STAR_COUNT = 190
const LAYER_SPEED = [0.0045, 0.011, 0.022]
const PARALLAX = [5, 13, 26]

// Mostly white. A few instrument-coloured stars tie the sky to the palette
// without turning it into confetti.
const STAR_COLORS = [
  '#ffffff',
  '#ffffff',
  '#ffffff',
  '#dbe6ff',
  '#cfe8ff',
  '#ffd9a8',
  '#a8e8ff',
]

export function Starfield({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let width = 0
    let height = 0
    let stars: Star[] = []
    let meteor: Meteor | null = null
    let nextMeteorAt = performance.now() + 4000 + Math.random() * 6000
    const pointer = { x: 0, y: 0 }
    const smoothed = { x: 0, y: 0 }

    const seed = () => {
      stars = Array.from({ length: STAR_COUNT }, () => {
        const depth = Math.floor(Math.random() * 3)
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          radius: 0.4 + depth * 0.35 + Math.random() * 0.5,
          depth,
          baseAlpha: 0.25 + depth * 0.16 + Math.random() * 0.3,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.0006 + Math.random() * 0.0016,
          color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)] as string,
        }
      })
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    const paint = (time: number) => {
      ctx.clearRect(0, 0, width, height)

      // Pointer parallax is eased rather than tracked directly, so moving the
      // mouse fast does not snap the whole sky sideways.
      smoothed.x += (pointer.x - smoothed.x) * 0.045
      smoothed.y += (pointer.y - smoothed.y) * 0.045

      for (const star of stars) {
        const twinkle = reducedMotion
          ? 1
          : 0.72 + Math.sin(star.twinklePhase + time * star.twinkleSpeed) * 0.28
        const offsetX = smoothed.x * (PARALLAX[star.depth] as number)
        const offsetY = smoothed.y * (PARALLAX[star.depth] as number)

        ctx.globalAlpha = Math.min(1, star.baseAlpha * twinkle)
        ctx.fillStyle = star.color
        ctx.beginPath()
        ctx.arc(star.x + offsetX, star.y + offsetY, star.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      if (meteor) {
        ctx.globalAlpha = Math.max(0, meteor.life) * 0.85
        const gradient = ctx.createLinearGradient(
          meteor.x,
          meteor.y,
          meteor.x - meteor.vx * meteor.length,
          meteor.y - meteor.vy * meteor.length,
        )
        gradient.addColorStop(0, '#ffffff')
        gradient.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.strokeStyle = gradient
        ctx.lineWidth = 1.4
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(meteor.x, meteor.y)
        ctx.lineTo(meteor.x - meteor.vx * meteor.length, meteor.y - meteor.vy * meteor.length)
        ctx.stroke()
      }

      ctx.globalAlpha = 1
    }

    const advance = (delta: number, time: number) => {
      for (const star of stars) {
        // Slow downward drift: the ground station is the thing that is moving.
        star.y += (LAYER_SPEED[star.depth] as number) * delta
        if (star.y > height + 2) {
          star.y = -2
          star.x = Math.random() * width
        }
      }

      if (meteor) {
        meteor.x += meteor.vx * delta * 0.35
        meteor.y += meteor.vy * delta * 0.35
        meteor.life -= delta * 0.0012
        if (meteor.life <= 0) meteor = null
      } else if (time > nextMeteorAt && width > 0) {
        // Rare on purpose. A meteor every few seconds is a screensaver.
        meteor = {
          x: Math.random() * width * 0.7,
          y: Math.random() * height * 0.4,
          vx: 1.5 + Math.random() * 0.8,
          vy: 0.55 + Math.random() * 0.4,
          life: 1,
          length: 48 + Math.random() * 46,
        }
        nextMeteorAt = time + 9000 + Math.random() * 14000
      }
    }

    resize()

    if (reducedMotion) {
      // One static paint. No loop, no listeners, nothing moving.
      paint(0)
      const observer = new ResizeObserver(() => {
        resize()
        paint(0)
      })
      observer.observe(canvas)
      return () => observer.disconnect()
    }

    let frame = 0
    let last = performance.now()
    let running = true

    const loop = (time: number) => {
      const delta = Math.min(time - last, 48)
      last = time
      advance(delta, time)
      paint(time)
      if (running) frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2
    }

    // A background canvas has no business burning CPU on a hidden tab.
    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(frame)
      } else if (!running) {
        running = true
        last = performance.now()
        frame = requestAnimationFrame(loop)
      }
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reducedMotion])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  )
}
