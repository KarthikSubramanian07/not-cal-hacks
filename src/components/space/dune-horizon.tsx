import { useReducedMotion } from '@/lib/hooks'
import { cn } from '@/lib/utils'

/**
 * The horizon: twin suns setting behind three ridges of sand.
 *
 * Adapted from the dune treatment on karthiksubramanian07.github.io. Three
 * silhouettes drift sideways at different speeds, which is what sells the
 * distance between them; a band of heat haze shimmers where the sand meets the
 * air; and the suns sit low enough to light the whole scene from below.
 *
 * This is where every warm colour in the product comes from. The rest of the
 * interface can stay cold because this is doing the lighting.
 */
export function DuneHorizon({ className }: { className?: string }) {
  const reduced = useReducedMotion()

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-x-0 overflow-hidden', className)}
    >
      {/* Sky wash: the light the suns throw onto the dust. */}
      <div
        className="absolute inset-x-0 bottom-0 h-full"
        style={{
          background:
            'radial-gradient(105% 85% at 29% 88%, oklch(0.84 0.15 78 / 0.26) 0%, oklch(0.62 0.15 45 / 0.11) 33%, transparent 66%)',
        }}
      />

      {/* The larger sun. */}
      <div
        className={cn(
          'absolute bottom-[19%] left-[26%] size-[15rem] -translate-x-1/2 rounded-full sm:bottom-[21%]',
          !reduced && 'animate-[sun-breathe_24s_ease-in-out_infinite]',
        )}
        style={{
          background:
            'radial-gradient(circle, oklch(0.95 0.09 84) 0%, oklch(0.86 0.15 74) 40%, oklch(0.68 0.16 52 / 0.34) 64%, transparent 71%)',
          filter: 'blur(1.5px)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Its smaller, cooler companion. */}
      <div
        className={cn(
          'absolute bottom-[30%] left-[40%] size-[7rem] -translate-x-1/2 rounded-full sm:bottom-[32%]',
          !reduced && 'animate-[sun-breathe_24s_ease-in-out_infinite_reverse]',
        )}
        style={{
          background:
            'radial-gradient(circle, oklch(0.92 0.09 58) 0%, oklch(0.75 0.16 44) 44%, oklch(0.56 0.15 36 / 0.30) 66%, transparent 73%)',
          filter: 'blur(2.5px)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Heat haze, sitting on the ridge line. */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-[16%] h-[7%]',
          !reduced && 'animate-[haze_7s_ease-in-out_infinite]',
        )}
        style={{
          background: 'linear-gradient(0deg, oklch(0.84 0.15 78 / 0.16) 0%, transparent 100%)',
          mixBlendMode: 'screen',
          filter: 'blur(9px)',
        }}
      />

      {/* Three ridges. Farther ones are paler, blurrier and drift slower. */}
      <Ridge
        className={cn(
          'bottom-[17%] opacity-55 blur-[0.6px]',
          !reduced && 'animate-[dune-drift-far_90s_linear_infinite]',
        )}
        fill="oklch(0.30 0.055 48)"
        d="M0,120 C160,74 300,132 470,104 C640,76 790,124 960,96 C1130,68 1290,112 1440,88 L1440,200 L0,200 Z"
      />
      <Ridge
        className={cn(
          'bottom-[8%] opacity-80',
          !reduced && 'animate-[dune-drift-mid_62s_linear_infinite]',
        )}
        fill="oklch(0.235 0.05 44)"
        d="M0,140 C180,96 330,158 520,126 C710,94 860,150 1040,120 C1220,90 1330,138 1440,116 L1440,200 L0,200 Z"
      />
      <Ridge
        className={cn('bottom-0', !reduced && 'animate-[dune-drift-near_44s_linear_infinite]')}
        fill="oklch(0.175 0.04 40)"
        d="M0,156 C200,118 340,176 560,148 C780,120 900,172 1120,146 C1300,124 1370,160 1440,144 L1440,200 L0,200 Z"
      />

      <style>{`
        @keyframes sun-breathe {
          0%, 100% { transform: translateY(0) scale(1); opacity: 1 }
          50% { transform: translateY(-10px) scale(1.03); opacity: .92 }
        }
        @keyframes haze {
          0%, 100% { transform: scaleY(1) translateY(0); opacity: .65 }
          50% { transform: scaleY(1.18) translateY(-4px); opacity: 1 }
        }
        @keyframes dune-drift-far  { from { transform: translateX(0) } to { transform: translateX(-3%) } }
        @keyframes dune-drift-mid  { from { transform: translateX(0) } to { transform: translateX(-5%) } }
        @keyframes dune-drift-near { from { transform: translateX(0) } to { transform: translateX(-7%) } }
      `}</style>
    </div>
  )
}

function Ridge({ className, fill, d }: { className?: string; fill: string; d: string }) {
  return (
    <svg
      className={cn('absolute -inset-x-[6%] w-[112%]', className)}
      viewBox="0 0 1440 200"
      preserveAspectRatio="none"
      style={{ height: '26%' }}
    >
      <path d={d} fill={fill} />
    </svg>
  )
}

/**
 * Animated film grain over the whole product.
 *
 * A flat dark page reads as a slide; a little moving noise reads as a
 * photographed surface. Stepped rather than smooth so it flickers like real
 * film rather than sliding like a texture.
 */
export function Grain() {
  const reduced = useReducedMotion()
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed -inset-[10%] z-[55]',
        !reduced && 'animate-[grain_1.4s_steps(6)_infinite]',
      )}
      style={{
        opacity: 0.055,
        mixBlendMode: 'overlay',
        backgroundSize: '220px 220px',
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 0.86 0 0 0 0 0.62 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      }}
    >
      <style>{`
        @keyframes grain {
          0%   { transform: translate(0,0) }
          20%  { transform: translate(-3%, 2%) }
          40%  { transform: translate(2%, -3%) }
          60%  { transform: translate(-2%, -2%) }
          80%  { transform: translate(3%, 2%) }
          100% { transform: translate(0,0) }
        }
      `}</style>
    </div>
  )
}
