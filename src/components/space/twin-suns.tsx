import { useReducedMotion } from '@/lib/hooks'
import { cn } from '@/lib/utils'

/**
 * Two suns low on the horizon.
 *
 * The binary sunset is the single most recognisable image in the genre and it
 * belongs to physics rather than to a studio, so it carries the homage without
 * borrowing anything. It also does real work: the two discs are where all the
 * warmth in the palette comes from, which is why the rest of the page can stay
 * cold and still feel lit.
 */
export function TwinSuns({ className }: { className?: string }) {
  const reduced = useReducedMotion()

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-x-0 overflow-hidden', className)}
    >
      {/* Atmospheric wash: the light the suns throw onto the dust. */}
      <div
        className="absolute inset-x-0 bottom-0 h-full"
        style={{
          background:
            'radial-gradient(120% 70% at 50% 108%, oklch(0.79 0.16 62 / 0.24) 0%, oklch(0.62 0.15 40 / 0.10) 34%, transparent 68%)',
        }}
      />

      {/* Larger, higher sun. */}
      <div
        className={cn('absolute bottom-[-7rem] left-[calc(50%-9rem)] size-[17rem] rounded-full', !reduced && 'animate-[sun-drift_26s_ease-in-out_infinite]')}
        style={{
          background:
            'radial-gradient(circle, oklch(0.93 0.11 78) 0%, oklch(0.82 0.16 62) 42%, oklch(0.66 0.17 48 / 0.35) 66%, transparent 72%)',
          filter: 'blur(2px)',
        }}
      />

      {/* Smaller companion, cooler and further away. */}
      <div
        className={cn('absolute bottom-[-4.5rem] left-[calc(50%+5rem)] size-[9rem] rounded-full', !reduced && 'animate-[sun-drift_26s_ease-in-out_infinite_reverse]')}
        style={{
          background:
            'radial-gradient(circle, oklch(0.90 0.10 52) 0%, oklch(0.72 0.17 40) 46%, oklch(0.55 0.16 34 / 0.30) 68%, transparent 74%)',
          filter: 'blur(3px)',
        }}
      />

      <style>{`
        @keyframes sun-drift {
          0%, 100% { transform: translateY(0) }
          50% { transform: translateY(-14px) }
        }
      `}</style>
    </div>
  )
}
