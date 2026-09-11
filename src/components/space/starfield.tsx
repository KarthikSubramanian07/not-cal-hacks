import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/lib/hooks'

/**
 * The sky.
 *
 * Built on the constellation field from karthiksubramanian07.github.io: stars
 * carry a depth value that drives both parallax and brightness, and any star
 * near the cursor is joined to it, and to its neighbours, by lines whose
 * opacity falls off with distance. Moving the pointer draws a constellation
 * that only exists while you are looking at it.
 *
 * On top of that: two nebula washes in the twin-sun palette, slow warm dust,
 * an occasional meteor, and a hyperspace jump the app can trigger.
 *
 * Everything lives on one canvas. There is no per-star DOM, the loop parks
 * itself when the tab is hidden, and reduced motion gets a single static paint
 * rather than a frozen animation.
 */

/**
 * Fires a hyperspace jump on the sky. Decoupled on purpose: the form that
 * submits an application should not have to hold a ref to the background.
 */
export const JUMP_EVENT = 'starfield:jump'
export const triggerHyperspaceJump = () => window.dispatchEvent(new CustomEvent(JUMP_EVENT))

/** Total length of the jump envelope, in milliseconds. */
const JUMP_MS = 1150

/** Squared pixel radius within which a star links to the cursor. */
const LINK_RADIUS_SQ = 20_000
/** Squared pixel radius within which two nearby stars link to each other. */
const NEIGHBOUR_RADIUS_SQ = 7_200

const STAR_COLOR = '#ffffff'
const SODIUM = '#f0b357'
const ION = '#7fd4f0'

interface Star {
  x: number
  y: number
  radius: number
  /** 0.2 to 1.1. Drives parallax distance, drift speed and brightness. */
  depth: number
  phase: number
  twinkleSpeed: number
}

interface Mote {
  x: number
  y: number
  radius: number
  drift: number
  fall: number
  alpha: number
}

interface Meteor {
  x: number
  y: number
  vx: number
  vy: number
  t: number
}

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

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
    let motes: Mote[] = []
    let nebulae: { x: number; y: number; r: number; hex: string }[] = []
    let meteor: Meteor | null = null
    let nextMeteorAt = performance.now() + 5000 + Math.random() * 6000
    let jumpStart: number | null = null

    // Raw pointer position, and the eased parallax it drives.
    const pointer = { x: -9999, y: -9999, nx: 0, ny: 0 }
    const eased = { x: 0, y: 0 }

    const seed = () => {
      // Density scales with area so a large monitor is not sparse and a phone
      // is not a snowstorm.
      const count = Math.min(230, Math.round((width * height) / 8000))
      stars = Array.from({ length: count }, () => {
        const z = Math.random()
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          radius: z * 1.5 + 0.35,
          depth: z * 0.9 + 0.2,
          phase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.004 + Math.random() * 0.016,
        }
      })

      // Warm dust, drifting sideways more than down. This is the desert half of
      // the image: the suns on the horizon light it.
      motes = Array.from({ length: Math.min(46, Math.round(count / 5)) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.5 + Math.random() * 1.3,
        drift: 0.06 + Math.random() * 0.16,
        fall: 0.012 + Math.random() * 0.05,
        alpha: 0.06 + Math.random() * 0.16,
      }))

      nebulae = [
        { x: width * 0.22, y: height * 0.3, r: Math.max(width, height) * 0.44, hex: SODIUM },
        { x: width * 0.8, y: height * 0.74, r: Math.max(width, height) * 0.46, hex: ION },
      ]
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      // Measure the viewport rather than the element, so the canvas can never
      // size itself from its own previous size.
      const nextWidth = Math.min(canvas.clientWidth || window.innerWidth, window.innerWidth)
      const nextHeight = Math.min(canvas.clientHeight || window.innerHeight, window.innerHeight)
      if (nextWidth === width && nextHeight === height) return
      width = nextWidth
      height = nextHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    /**
     * Jump envelope: accelerate hard, then settle back to still. Returns 0 when
     * idle, peaking at 1 mid-jump.
     */
    const jumpAmount = (time: number) => {
      if (jumpStart === null) return 0
      const t = (time - jumpStart) / JUMP_MS
      if (t >= 1) {
        jumpStart = null
        return 0
      }
      return t < 0.35 ? Math.pow(t / 0.35, 2) : Math.pow(1 - (t - 0.35) / 0.65, 1.6)
    }

    const paintJump = (jump: number) => {
      // Stars stretch away from the centre. Drawing them as lines rather than
      // moving them keeps the field intact on arrival.
      const cx = width / 2
      const cy = height / 2
      ctx.lineCap = 'round'
      for (const star of stars) {
        const dx = star.x - cx
        const dy = star.y - cy
        const distance = Math.hypot(dx, dy) || 1
        const stretch = jump * (70 + star.depth * 150) * (0.35 + distance / Math.max(width, height))
        ctx.globalAlpha = Math.min(1, 0.4 + jump * 0.6)
        ctx.strokeStyle = STAR_COLOR
        ctx.lineWidth = star.radius * 1.4
        ctx.beginPath()
        ctx.moveTo(star.x, star.y)
        ctx.lineTo(star.x + (dx / distance) * stretch, star.y + (dy / distance) * stretch)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    const paint = (time: number) => {
      ctx.clearRect(0, 0, width, height)

      const jump = jumpAmount(time)
      if (jump > 0.001) {
        paintJump(jump)
        return
      }

      // Nebula washes, offset slightly with the pointer so the background has
      // depth behind the stars rather than sitting flat.
      for (const nebula of nebulae) {
        const gx = nebula.x + eased.x * 12
        const gy = nebula.y + eased.y * 12
        const gradient = ctx.createRadialGradient(gx, gy, 0, gx, gy, nebula.r)
        gradient.addColorStop(0, rgba(nebula.hex, 0.075))
        gradient.addColorStop(1, rgba(nebula.hex, 0))
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)
      }

      // Dust sits behind the stars and never links to anything.
      for (const mote of motes) {
        ctx.globalAlpha = mote.alpha
        ctx.fillStyle = SODIUM
        ctx.beginPath()
        ctx.arc(mote.x + eased.x * 8, mote.y + eased.y * 8, mote.radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Stars, and the ones close enough to the cursor to join the constellation.
      const near: [number, number][] = []
      for (const star of stars) {
        const twinkle = reducedMotion
          ? 1
          : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(star.phase + time * star.twinkleSpeed))
        const px = star.x + eased.x * star.depth * 26
        const py = star.y + eased.y * star.depth * 26

        ctx.beginPath()
        ctx.arc(px, py, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = rgba(STAR_COLOR, 0.8 * twinkle * star.depth)
        ctx.fill()

        const dx = px - pointer.x
        const dy = py - pointer.y
        if (dx * dx + dy * dy < LINK_RADIUS_SQ) near.push([px, py])
      }

      if (near.length > 0) {
        ctx.lineWidth = 0.7
        for (let a = 0; a < near.length; a++) {
          const [ax, ay] = near[a] as [number, number]

          // Line from the cursor to the star, fading with distance.
          const toCursor = (ax - pointer.x) ** 2 + (ay - pointer.y) ** 2
          ctx.strokeStyle = rgba(STAR_COLOR, Math.max(0, (1 - toCursor / LINK_RADIUS_SQ) * 0.45))
          ctx.beginPath()
          ctx.moveTo(pointer.x, pointer.y)
          ctx.lineTo(ax, ay)
          ctx.stroke()

          // And between neighbours, which is what makes it read as a shape
          // rather than a starburst.
          for (let b = a + 1; b < near.length; b++) {
            const [bx, by] = near[b] as [number, number]
            const between = (ax - bx) ** 2 + (ay - by) ** 2
            if (between < NEIGHBOUR_RADIUS_SQ) {
              ctx.strokeStyle = rgba(
                STAR_COLOR,
                Math.max(0, (1 - between / NEIGHBOUR_RADIUS_SQ) * 0.3),
              )
              ctx.beginPath()
              ctx.moveTo(ax, ay)
              ctx.lineTo(bx, by)
              ctx.stroke()
            }
          }
        }

        // The cursor itself becomes the brightest point in the constellation.
        ctx.fillStyle = rgba(SODIUM, 0.9)
        ctx.beginPath()
        ctx.arc(pointer.x, pointer.y, 2, 0, Math.PI * 2)
        ctx.fill()
      }

      if (meteor) {
        const progress = meteor.t
        const fade = progress < 0.15 ? progress / 0.15 : progress > 0.75 ? (1 - progress) / 0.25 : 1
        const sx = meteor.x + meteor.vx * progress
        const sy = meteor.y + meteor.vy * progress
        const tail = ctx.createLinearGradient(sx, sy, sx - meteor.vx * 0.05, sy - meteor.vy * 0.05)
        tail.addColorStop(0, rgba(SODIUM, Math.max(0, fade)))
        tail.addColorStop(1, rgba(SODIUM, 0))
        ctx.strokeStyle = tail
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx - meteor.vx * 0.05, sy - meteor.vy * 0.05)
        ctx.stroke()
      }

      ctx.globalAlpha = 1
    }

    const advance = (delta: number, time: number) => {
      // Pointer parallax is eased rather than tracked, so a fast mouse does not
      // snap the whole sky sideways.
      eased.x += (pointer.nx - eased.x) * 0.045
      eased.y += (pointer.ny - eased.y) * 0.045

      for (const star of stars) {
        star.y += star.depth * 0.012 * delta
        if (star.y > height + 2) {
          star.y = -2
          star.x = Math.random() * width
        }
      }

      for (const mote of motes) {
        mote.x += mote.drift * delta * 0.06
        mote.y += mote.fall * delta * 0.06
        if (mote.x > width + 4) mote.x = -4
        if (mote.y > height + 4) {
          mote.y = -4
          mote.x = Math.random() * width
        }
      }

      if (meteor) {
        meteor.t += delta * 0.00085
        if (meteor.t >= 1) meteor = null
      } else if (time > nextMeteorAt && width > 0) {
        // Rare on purpose. A meteor every few seconds is a screensaver.
        meteor = {
          x: Math.random() * width * 0.6,
          y: Math.random() * height * 0.35,
          vx: width * 0.5 + Math.random() * width * 0.3,
          vy: height * 0.28 + Math.random() * height * 0.2,
          t: 0,
        }
        nextMeteorAt = time + 9000 + Math.random() * 12000
      }
    }

    resize()

    if (reducedMotion) {
      // One static paint. No loop, no pointer tracking, nothing moving.
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
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.nx = (event.clientX / window.innerWidth - 0.5) * 2
      pointer.ny = (event.clientY / window.innerHeight - 0.5) * 2
    }

    // A pointer that has left the window should not leave a constellation
    // pinned to the last place it was.
    const onPointerOut = () => {
      pointer.x = -9999
      pointer.y = -9999
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

    const onJump = () => {
      jumpStart = performance.now()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerout', onPointerOut)
    window.addEventListener(JUMP_EVENT, onJump)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerout', onPointerOut)
      window.removeEventListener(JUMP_EVENT, onJump)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reducedMotion])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      /*
       * Width and height are pinned in CSS on purpose. Setting `canvas.width`
       * changes the element's intrinsic size, and with only `inset: 0` to
       * constrain it that feeds straight back into the ResizeObserver, which
       * grows the bitmap again on the next frame. Left alone it runs away to
       * millions of pixels and the context stops drawing entirely.
       */
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
