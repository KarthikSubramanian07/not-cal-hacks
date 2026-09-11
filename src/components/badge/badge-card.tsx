import { cn } from '@/lib/utils'

export interface BadgeCardProps {
  name: string
  role: string
  code: string
  /** Stamped across the badge once a decision exists, e.g. ADMITTED. */
  stamp?: string | null
  stampTone?: 'accepted' | 'pending' | 'declined'
  className?: string
}

/**
 * The artifact the whole product is about: the pass you get when you are in.
 *
 * It is the one light surface in the interface, deliberately. In a dark room
 * lit by two low suns, a laminated card is the thing that catches the light,
 * so it is warm sand rather than paper white and it carries the same amber the
 * horizon does.
 */
export function BadgeCard({
  name,
  role,
  code,
  stamp,
  stampTone = 'pending',
  className,
}: BadgeCardProps) {
  return (
    <div
      className={cn(
        'relative flex h-[290px] w-[206px] flex-col overflow-hidden rounded-xl select-none',
        className,
      )}
      style={{
        // Sand rather than white, with the light falling from the top left.
        background: 'linear-gradient(157deg, #f6efe1 0%, #e8dcc6 58%, #dccdb2 100%)',
        color: '#17130d',
        boxShadow:
          '0 26px 60px -20px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.10), 0 1px 0 rgba(255,255,255,.55) inset',
      }}
    >
      {/* Slot punch, the way a real pass is cut. */}
      <div className="flex justify-center pt-3">
        <div className="h-2.5 w-12 rounded-full bg-[#17130d]/85 shadow-[0_1px_0_rgba(255,255,255,.5)]" />
      </div>

      <div className="flex items-center justify-between px-4 pt-3">
        <span className="font-mono text-[9px] font-medium tracking-[0.16em] text-[#17130d]/60 uppercase">
          Not Cal Hacks
        </span>
        <span className="font-mono text-[9px] tracking-[0.12em] text-[#17130d]/40">FA26</span>
      </div>

      {/* The amber rule ties the badge to the suns behind it. */}
      <div
        className="mx-4 mt-2 h-[2px] rounded-full"
        style={{ background: 'linear-gradient(90deg,#d4881f,#e8b45a 55%,transparent)' }}
      />

      <div className="flex flex-1 flex-col justify-between px-4 pt-4 pb-3">
        <div>
          <p className="font-mono text-[9px] tracking-[0.14em] text-[#17130d]/45 uppercase">
            Bearer
          </p>
          <p className="mt-1 text-[25px] leading-[0.95] font-medium tracking-[-0.04em] text-[#17130d]">
            {name}
          </p>
          <p className="mt-2 inline-flex rounded-full bg-[#17130d]/10 px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] text-[#17130d]/65 uppercase">
            {role}
          </p>
        </div>

        <div className="space-y-2">
          {/* Barcode drawn with a gradient: no image request, still reads as print. */}
          <div
            aria-hidden
            className="h-8 w-full opacity-80"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, #17130d 0 2px, transparent 2px 4px, #17130d 4px 5px, transparent 5px 9px, #17130d 9px 12px, transparent 12px 14px)',
            }}
          />
          <div className="flex items-center justify-between font-mono text-[9px] tracking-[0.12em] text-[#17130d]/50">
            <span>NO. {code}</span>
            <span>ADMIT ONE</span>
          </div>
        </div>
      </div>

      {/* A faint sheen, as if the lamination is catching one of the suns. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(118deg, transparent 34%, rgba(255,255,255,.44) 46%, transparent 58%)',
          mixBlendMode: 'soft-light',
        }}
      />

      {stamp ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-[42%] flex -rotate-[9deg] justify-center"
          aria-hidden
        >
          <span
            className={cn(
              'rounded-[3px] border-[3px] px-3 py-1 font-mono text-[15px] font-medium tracking-[0.16em] uppercase opacity-80',
              stampTone === 'accepted' && 'border-[#3f7d1f] text-[#3f7d1f]',
              stampTone === 'pending' && 'border-[#a8641a] text-[#a8641a]',
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
