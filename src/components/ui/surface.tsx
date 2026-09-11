import { cn } from '@/lib/utils'

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-line bg-surface',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/** Small mono label used as a section marker throughout the product. */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <p className={cn('eyebrow', className)}>{children}</p>
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-line/70', className)}
      aria-hidden
    />
  )
}

/**
 * Empty states are written as sentences, not as shrugging illustrations. Each
 * one says what happened and what to do next.
 */
export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string
  body: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line px-8 py-16 text-center',
        className,
      )}
    >
      <h3 className="text-xl text-fg">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-fg-muted">{body}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  )
}
