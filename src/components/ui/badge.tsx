import { STATUS_META, type ApplicationStatus, type ApplicationType } from '@shared/constants'
import { cn } from '@/lib/utils'

/**
 * Status colour is load-bearing, so it is defined once here and nowhere else.
 * A dot carries the colour and the word carries the meaning, so the badge still
 * works for anyone who cannot distinguish the hues.
 */
const STATUS_STYLES: Record<ApplicationStatus, { dot: string; text: string; ring: string }> = {
  draft: { dot: 'bg-status-draft', text: 'text-status-draft', ring: 'border-status-draft/30' },
  submitted: {
    dot: 'bg-status-submitted',
    text: 'text-status-submitted',
    ring: 'border-status-submitted/30',
  },
  under_review: {
    dot: 'bg-status-review',
    text: 'text-status-review',
    ring: 'border-status-review/30',
  },
  accepted: {
    dot: 'bg-status-accepted',
    text: 'text-status-accepted',
    ring: 'border-status-accepted/30',
  },
  waitlisted: {
    dot: 'bg-status-waitlisted',
    text: 'text-status-waitlisted',
    ring: 'border-status-waitlisted/30',
  },
  rejected: {
    dot: 'bg-status-rejected',
    text: 'text-status-rejected',
    ring: 'border-status-rejected/30',
  },
}

export function StatusBadge({
  status,
  className,
  size = 'md',
}: {
  status: ApplicationStatus
  className?: string
  size?: 'sm' | 'md'
}) {
  const style = STATUS_STYLES[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border whitespace-nowrap',
        style.ring,
        style.text,
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', style.dot)} aria-hidden />
      {/* Only live statuses pulse. A decided application should sit still. */}
      {status === 'under_review' ? (
        <span
          className={cn('absolute size-1.5 animate-ping rounded-full opacity-60', style.dot)}
          aria-hidden
        />
      ) : null}
      {STATUS_META[status].label}
    </span>
  )
}

export function TypeBadge({ type, className }: { type: ApplicationType; className?: string }) {
  return (
    <span
      className={cn(
        'border-line text-fg-muted inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase',
        className,
      )}
    >
      {type}
    </span>
  )
}
