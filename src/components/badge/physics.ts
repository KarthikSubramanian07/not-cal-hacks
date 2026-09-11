/**
 * A small verlet solver for the lanyard.
 *
 * Two cords hang from two anchors and meet at a single shared clip point, which
 * is what makes it read as a lanyard rather than a string. The badge below the
 * clip is a separate angular spring, so it keeps swinging for a moment after
 * the cord has settled. That lag is the whole reason the thing feels physical.
 *
 * Verlet rather than spring-mass because distance constraints are solved by
 * projection, which cannot explode the way a stiff spring integrator can when
 * someone flings the badge across the screen.
 */

export interface Point {
  x: number
  y: number
  /** Previous position. Velocity is implied by the gap, which is the trick. */
  px: number
  py: number
  pinned: boolean
}

export interface LanyardState {
  ropeA: Point[]
  ropeB: Point[]
  clip: Point
  /** Badge rotation in radians, with its own momentum. */
  angle: number
  angularVelocity: number
}

export interface LanyardConfig {
  width: number
  height: number
  /** Horizontal gap between the two anchor points, in pixels. */
  anchorSpread: number
  cordLength: number
  segments: number
}

const GRAVITY = 0.75
const DAMPING = 0.982
const CONSTRAINT_ITERATIONS = 16
/** How hard the badge rotates back toward hanging straight down. */
const ANGULAR_STIFFNESS = 0.055
const ANGULAR_DAMPING = 0.9

const makePoint = (x: number, y: number, pinned = false): Point => ({ x, y, px: x, py: y, pinned })

export function createLanyard(config: LanyardConfig): LanyardState {
  const anchorY = 0
  const leftX = config.width / 2 - config.anchorSpread / 2
  const rightX = config.width / 2 + config.anchorSpread / 2
  const clip = makePoint(config.width / 2, config.cordLength)

  const build = (ax: number, ay: number): Point[] => {
    const points: Point[] = [makePoint(ax, ay, true)]
    for (let i = 1; i < config.segments; i++) {
      const t = i / config.segments
      points.push(makePoint(ax + (clip.x - ax) * t, ay + (clip.y - ay) * t))
    }
    points.push(clip)
    return points
  }

  return {
    ropeA: build(leftX, anchorY),
    ropeB: build(rightX, anchorY),
    clip,
    angle: 0,
    angularVelocity: 0,
  }
}

function integrate(point: Point, windX: number) {
  if (point.pinned) return
  const vx = (point.x - point.px) * DAMPING
  const vy = (point.y - point.py) * DAMPING
  point.px = point.x
  point.py = point.y
  point.x += vx + windX
  point.y += vy + GRAVITY
}

/** Pulls the two ends of a segment back to its rest length, half from each end. */
function constrain(a: Point, b: Point, rest: number) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const distance = Math.hypot(dx, dy) || 0.0001
  const difference = (distance - rest) / distance

  // A pinned point contributes no movement, so its share goes to the other end.
  const aMove = a.pinned ? 0 : b.pinned ? 1 : 0.5
  const bMove = b.pinned ? 0 : a.pinned ? 1 : 0.5

  a.x += dx * difference * aMove
  a.y += dy * difference * aMove
  b.x -= dx * difference * bMove
  b.y -= dy * difference * bMove
}

export function stepLanyard(
  state: LanyardState,
  config: LanyardConfig,
  options: { drag: { x: number; y: number } | null; time: number },
): void {
  // A barely-there breeze, so an untouched badge is never perfectly static.
  const wind = Math.sin(options.time * 0.0009) * 0.045 + Math.sin(options.time * 0.0023) * 0.02

  const previousClipX = state.clip.x

  for (const point of state.ropeA) integrate(point, wind)
  // The shared clip is the last element of both ropes; integrating it twice
  // would double gravity, so rope B skips its final point.
  for (let i = 0; i < state.ropeB.length - 1; i++) integrate(state.ropeB[i] as Point, wind)

  if (options.drag) {
    // Position is set directly rather than forced. The gap this opens against
    // the previous position becomes the fling velocity when the pointer lets go.
    state.clip.x = options.drag.x
    state.clip.y = options.drag.y
  }

  const restA = config.cordLength / config.segments
  for (let iteration = 0; iteration < CONSTRAINT_ITERATIONS; iteration++) {
    for (let i = 0; i < state.ropeA.length - 1; i++) {
      constrain(state.ropeA[i] as Point, state.ropeA[i + 1] as Point, restA)
    }
    for (let i = 0; i < state.ropeB.length - 1; i++) {
      constrain(state.ropeB[i] as Point, state.ropeB[i + 1] as Point, restA)
    }
    if (options.drag) {
      state.clip.x = options.drag.x
      state.clip.y = options.drag.y
    }
  }

  // Keep the badge inside its box rather than letting a hard fling lose it.
  const margin = 20
  state.clip.x = Math.min(Math.max(state.clip.x, margin), config.width - margin)
  state.clip.y = Math.min(Math.max(state.clip.y, margin), config.height - margin)

  // --- badge rotation ------------------------------------------------------
  const tail = state.ropeA[state.ropeA.length - 2] as Point
  const tailB = state.ropeB[state.ropeB.length - 2] as Point
  const cordAngle = Math.atan2(
    state.clip.x - (tail.x + tailB.x) / 2,
    state.clip.y - (tail.y + tailB.y) / 2,
  )

  // Sideways acceleration of the clip throws the badge, the way a real one lags
  // behind the hand carrying it.
  const clipAcceleration = state.clip.x - previousClipX
  state.angularVelocity += (-cordAngle - state.angle) * ANGULAR_STIFFNESS
  state.angularVelocity += clipAcceleration * 0.0016
  state.angularVelocity *= ANGULAR_DAMPING
  state.angle += state.angularVelocity
}

/** Smooth cord path. Midpoints as curve ends keeps the joints from kinking. */
export function ropePath(points: Point[]): string {
  if (points.length < 2) return ''
  const first = points[0] as Point
  let d = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`
  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i] as Point
    const next = points[i + 1] as Point
    d += ` Q ${current.x.toFixed(2)} ${current.y.toFixed(2)} ${((current.x + next.x) / 2).toFixed(2)} ${((current.y + next.y) / 2).toFixed(2)}`
  }
  const last = points[points.length - 1] as Point
  d += ` L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`
  return d
}
