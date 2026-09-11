import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { BadgeCard, type BadgeCardProps } from './badge-card'
import { createLanyard, ropePath, stepLanyard, type LanyardConfig, type LanyardState } from './physics'

/**
 * The simulation runs in its own fixed coordinate space and the whole rig is
 * then scaled to fit whatever width the layout gives it. Scaling the container
 * rather than the physics keeps the cord, the badge and the pointer in exactly
 * one coordinate system, which is what stops the badge from drifting out of the
 * cord at different viewport widths.
 */
const CONFIG: LanyardConfig = {
  width: 360,
  height: 430,
  anchorSpread: 118,
  cordLength: 150,
  segments: 12,
}

const BADGE_WIDTH = 206
/** Distance from the clip point down to the top edge of the badge. */
const BADGE_OFFSET_Y = 10

export function Lanyard({ className, ...badge }: BadgeCardProps & { className?: string }) {
  const reducedMotion = useReducedMotion()
  const outerRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const badgeRef = useRef<HTMLDivElement | null>(null)
  const pathARef = useRef<SVGPathElement | null>(null)
  const pathBRef = useRef<SVGPathElement | null>(null)
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const scaleRef = useRef(1)
  const [scale, setScale] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [ready, setReady] = useState(false)

  // Keep the rig fitted to its column as the window resizes.
  useLayoutEffect(() => {
    const node = outerRef.current
    if (!node) return
    const measure = () => {
      const next = node.clientWidth / CONFIG.width
      scaleRef.current = next
      setScale(next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (reducedMotion) return

    const state: LanyardState = createLanyard(CONFIG)

    // Start lifted and off-centre so the badge drops and swings into place on
    // load. It demonstrates the interaction without a caption saying "drag me".
    state.clip.x = CONFIG.width / 2 + 46
    state.clip.y = CONFIG.cordLength - 58
    state.clip.px = state.clip.x - 2.5
    state.clip.py = state.clip.y

    let frame = 0
    let mounted = true

    const loop = (time: number) => {
      if (!mounted) return
      stepLanyard(state, CONFIG, { drag: dragRef.current, time })

      pathARef.current?.setAttribute('d', ropePath(state.ropeA))
      pathBRef.current?.setAttribute('d', ropePath(state.ropeB))

      if (badgeRef.current) {
        badgeRef.current.style.transform =
          `translate3d(${(state.clip.x - BADGE_WIDTH / 2).toFixed(2)}px, ${(state.clip.y - BADGE_OFFSET_Y).toFixed(2)}px, 0)` +
          ` rotate(${(state.angle * (180 / Math.PI)).toFixed(2)}deg)`
      }

      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    setReady(true)

    return () => {
      mounted = false
      cancelAnimationFrame(frame)
    }
  }, [reducedMotion])

  /** Pointer position in simulation units. */
  const toLocal = (event: React.PointerEvent) => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return null
    const s = scaleRef.current || 1
    return { x: (event.clientX - rect.left) / s, y: (event.clientY - rect.top) / s }
  }

  const onPointerDown = (event: React.PointerEvent) => {
    if (reducedMotion) return
    const point = toLocal(event)
    if (!point) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = point
    setDragging(true)
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragRef.current) return
    const point = toLocal(event)
    if (point) dragRef.current = point
  }

  const endDrag = (event: React.PointerEvent) => {
    if (!dragRef.current) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    dragRef.current = null
    setDragging(false)
  }

  const anchorLeft = CONFIG.width / 2 - CONFIG.anchorSpread / 2
  const anchorRight = CONFIG.width / 2 + CONFIG.anchorSpread / 2

  return (
    <div
      ref={outerRef}
      className={cn('relative touch-none select-none', className)}
      style={{ height: CONFIG.height * scale }}
    >
      <div
        ref={stageRef}
        className="absolute top-0 left-1/2 origin-top"
        style={{
          width: CONFIG.width,
          height: CONFIG.height,
          marginLeft: -(CONFIG.width / 2),
          transform: `scale(${scale})`,
        }}
      >
        <svg
          viewBox={`0 0 ${CONFIG.width} ${CONFIG.height}`}
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <linearGradient id="lanyard-cord" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3f3f46" />
              <stop offset="100%" stopColor="#71717a" />
            </linearGradient>
          </defs>
          {reducedMotion ? (
            <>
              <path
                d={`M ${anchorLeft} 0 L ${CONFIG.width / 2} ${CONFIG.cordLength}`}
                stroke="url(#lanyard-cord)"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d={`M ${anchorRight} 0 L ${CONFIG.width / 2} ${CONFIG.cordLength}`}
                stroke="url(#lanyard-cord)"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
              />
            </>
          ) : (
            <>
              <path ref={pathARef} stroke="url(#lanyard-cord)" strokeWidth="5" fill="none" strokeLinecap="round" />
              <path ref={pathBRef} stroke="url(#lanyard-cord)" strokeWidth="5" fill="none" strokeLinecap="round" />
            </>
          )}
        </svg>

        <div
          ref={badgeRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={cn(
            'absolute top-0 left-0 origin-top will-change-transform',
            !reducedMotion && (dragging ? 'cursor-grabbing' : 'cursor-grab'),
            !reducedMotion && !ready && 'opacity-0',
          )}
          style={
            reducedMotion
              ? {
                  transform: `translate3d(${CONFIG.width / 2 - BADGE_WIDTH / 2}px, ${CONFIG.cordLength - BADGE_OFFSET_Y}px, 0)`,
                }
              : undefined
          }
        >
          <BadgeCard {...badge} />
        </div>
      </div>
    </div>
  )
}
