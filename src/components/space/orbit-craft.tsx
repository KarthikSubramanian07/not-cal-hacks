import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/lib/hooks'
import { cn } from '@/lib/utils'

/**
 * A craft leaving a ringed planet.
 *
 * Adapted from the hero on karthiksubramanian07.github.io, recoloured into the
 * sand palette so it belongs to the same world as the horizon. The ring carries
 * live dust rather than a static dash pattern, and hovering the whole thing
 * speeds the dust up, which is the sort of detail nobody asks for and everybody
 * notices.
 *
 * It sits next to the sentence about handing your application in, because that
 * is the moment the thing actually leaves your hands.
 */

const DUST_COUNT = 18

interface Dust {
  el: SVGCircleElement
  angle: number
  speed: number
  rx: number
  ry: number
}

export function OrbitCraft({ className }: { className?: string }) {
  const reduced = useReducedMotion()
  const dustGroupRef = useRef<SVGGElement | null>(null)
  const boostRef = useRef(0)

  useEffect(() => {
    const group = dustGroupRef.current
    if (!group) return

    const dust: Dust[] = []
    for (let i = 0; i < (reduced ? 10 : DUST_COUNT); i++) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      const radius = Math.random() * 1.5 + 0.7
      el.setAttribute('r', radius.toFixed(2))
      el.setAttribute('fill', i % 5 === 0 ? '#7fd4f0' : '#f0b357')
      el.setAttribute('opacity', (Math.random() * 0.45 + 0.45).toFixed(2))
      group.appendChild(el)
      dust.push({
        el,
        angle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.4 + 0.5,
        rx: 90 + Math.random() * 24,
        ry: 23 + Math.random() * 8,
      })
    }

    // Place them once so the ring is populated even without a loop.
    for (const d of dust) {
      d.el.setAttribute('cx', (125 + d.rx * Math.cos(d.angle)).toFixed(1))
      d.el.setAttribute('cy', (266 + d.ry * Math.sin(d.angle)).toFixed(1))
    }

    if (reduced) return () => group.replaceChildren()

    let frame = 0
    let running = true
    const loop = () => {
      const boost = 1 + boostRef.current * 1.7
      for (const d of dust) {
        d.angle += 0.006 * d.speed * boost
        d.el.setAttribute('cx', (125 + d.rx * Math.cos(d.angle)).toFixed(1))
        d.el.setAttribute('cy', (266 + d.ry * Math.sin(d.angle)).toFixed(1))
      }
      if (running) frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    return () => {
      running = false
      cancelAnimationFrame(frame)
      group.replaceChildren()
    }
  }, [reduced])

  return (
    <div
      className={cn('relative select-none', className)}
      onMouseEnter={() => {
        boostRef.current = 1
      }}
      onMouseLeave={() => {
        boostRef.current = 0
      }}
      aria-hidden
    >
      <svg viewBox="0 0 250 380" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id="nch-planet" cx="36%" cy="32%" r="80%">
            <stop offset="0%" stopColor="#f3d7a8" />
            <stop offset="50%" stopColor="#d9a05a" />
            <stop offset="100%" stopColor="#8a4f24" />
          </radialGradient>
          <clipPath id="nch-planet-clip">
            <circle cx="125" cy="266" r="54" />
          </clipPath>
        </defs>

        {/* The ring passes behind the planet. */}
        <g transform="rotate(-20 125 266)">
          <ellipse
            cx="125"
            cy="266"
            rx="102"
            ry="27"
            fill="none"
            stroke="#7fd4f0"
            strokeWidth="1.6"
            opacity="0.28"
          />
        </g>

        <circle cx="125" cy="266" r="54" fill="url(#nch-planet)" />
        <g clipPath="url(#nch-planet-clip)">
          {/* Craters, each a dark pit with a lit rim. */}
          <g opacity="0.55">
            {[
              [107, 252, 9, 7.4],
              [139, 278, 6.6, 5.3],
              [125, 242, 4.6, 3.6],
              [146, 259, 4, 3.1],
              [112, 284, 3.4, 2.6],
            ].map(([cx, cy, r1, r2]) => (
              <g key={`${cx}-${cy}`}>
                <circle cx={cx} cy={cy} r={r1} fill="#8a4f24" />
                <circle cx={(cx as number) - 2} cy={(cy as number) - 2} r={r2} fill="#c9853f" />
              </g>
            ))}
          </g>
          {/* Terminator: the half turned away from the suns. */}
          <path d="M88 232 a54 54 0 0 0 18 70 q24 -40 -18 -70 Z" fill="#000" opacity="0.18" />
        </g>

        {/* Ring front pass, with the live dust riding it. */}
        <g transform="rotate(-20 125 266)">
          <path
            d="M23 266 a102 27 0 0 0 204 0"
            fill="none"
            stroke="#7fd4f0"
            strokeWidth="1.6"
            opacity="0.5"
          />
          <g ref={dustGroupRef} />
        </g>

        {/* The craft. Deliberately a child's drawing of a rocket. */}
        <g className={cn(!reduced && 'animate-[craft-hover_6s_ease-in-out_infinite]')}>
          <path
            d="M125 32 C111 49 107 72 107 102 L107 124 C107 137 143 137 143 124 L143 102 C143 72 139 49 125 32 Z"
            fill="#e7e2d6"
          />
          <path d="M107 106 L89 138 L107 128 Z" fill="#f0b357" />
          <path d="M143 106 L161 138 L143 128 Z" fill="#f0b357" />
          <path
            className={cn(!reduced && 'animate-[craft-flame_.36s_ease-in-out_infinite_alternate]')}
            style={{ transformOrigin: '125px 132px' }}
            d="M125 132 C134 145 132 164 125 172 C118 164 116 145 125 132 Z"
            fill="#f0b357"
          />
          <circle cx="125" cy="80" r="10" fill="#121319" stroke="#7fd4f0" strokeWidth="2.6" />
        </g>
      </svg>

      <style>{`
        @keyframes craft-hover {
          0%, 100% { transform: translateY(0) }
          50% { transform: translateY(-9px) }
        }
        @keyframes craft-flame {
          from { transform: scaleY(.82) }
          to { transform: scaleY(1.12) }
        }
      `}</style>
    </div>
  )
}
