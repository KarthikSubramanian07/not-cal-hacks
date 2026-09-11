import { cn } from '@/lib/utils'

export interface BadgeCardProps {
  name: string
  role: string
  code: string
  /** Shown as a stamped line across the badge, e.g. ACCEPTED. */
  stamp?: string | null
  stampTone?: 'accepted' | 'pending' | 'declined'
  className?: string
}

/**
 * The physical artifact the whole product is about: the badge you get when you
 * are in. It is deliberately the only light surface in the interface, because a
 * laminated card in a dark room is exactly what it is imitating.
 */
export function BadgeCard({ name, role, code, stamp, stampTone = 'pending', className }: BadgeCardProps) {
  return (
    <div
      className={cn(
        'relative flex h-[290px] w-[206px] flex-col overflow-hidden rounded-xl bg-fg text-ink select-none',
        'shadow-[0_24px_60px_-18px_rgba(0,0,0,0.85),0_2px_0_rgba(255,255,255,0.35)_inset]',
        className,
      )}
    >
      {/* Punch hole, with a slot rather than a circle like the real thing. */}
      <div className="flex justify-center pt-3">
        <div className="h-2.5 w-12 rounded-full bg-ink/85 shadow-[0_1px_0_rgba(255,255,255,0.5)]" />
      </div>

      <div className="flex items-center justify-between px-4 pt-3">
        <span className="font-mono text-[9px] font-medium tracking-[0.18em] text-ink/55 uppercase">
          Not Cal Hacks
        </span>
        <span className="font-mono text-[9px] tracking-[0.14em] text-ink/40">FA26</span>
      </div>

      <div className="mt-2 h-px bg-ink/15" />

      <div className="flex flex-1 flex-col justify-between px-4 pt-4 pb-3">
        <div>
          <p className="font-mono text-[9px] tracking-[0.16em] text-ink/45 uppercase">Bearer</p>
          <p
            className="mt-1 text-[25px] leading-[0.95] font-medium tracking-[-0.04em] text-ink"
          >
            {name}
          </p>
          <p className="mt-2 inline-flex rounded-full bg-ink/8 px-2 py-0.5 font-mono text-[9px] tracking-[0.14em] text-ink/60 uppercase">
            {role}
          </p>
        </div>

        <div className="space-y-2">
          {/* A barcode drawn with a gradient: no image request, still reads as print. */}
          <div
            aria-hidden
            className="h-8 w-full opacity-85"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, #0c0b0a 0 2px, transparent 2px 4px, #0c0b0a 4px 5px, transparent 5px 9px, #0c0b0a 9px 12px, transparent 12px 14px)',
            }}
          />
          <div className="flex items-center justify-between font-mono text-[9px] tracking-[0.14em] text-ink/50">
            <span>NO. {code}</span>
            <span>ADMIT ONE</span>
          </div>
        </div>
      </div>

      {stamp ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-[42%] flex -rotate-[9deg] justify-center"
          aria-hidden
        >
          <span
            className={cn(
              'rounded-[3px] border-[3px] px-3 py-1 font-mono text-[15px] font-medium tracking-[0.18em] uppercase opacity-80',
              stampTone === 'accepted' && 'border-[#3f7d1f] text-[#3f7d1f]',
              stampTone === 'pending' && 'border-[#b06a12] text-[#b06a12]',
              stampTone === 'declined' && 'border-[#a33227] text-[#a33227]',
            )}
            style={{ mixBlendMode: 'multiply' }}
          >
            {stamp}
          </span>
        </div>
      ) : null}
    </div>
  )
}
