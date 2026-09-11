import { Link } from 'react-router'
import { Logo } from './logo'
import { cn } from '@/lib/utils'

/**
 * Mark plus name. The name is the repository name, lowercase and hyphenated: it
 * should look like something a developer typed rather than something an agency
 * approved, and the joke lives in the first syllable.
 */
export function Wordmark({ className, to = '/' }: { className?: string; to?: string | null }) {
  const content = (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Logo className="size-[22px] shrink-0" />
      <span className="text-fg text-[15px] font-medium tracking-[-0.02em]">not-cal-hacks</span>
    </span>
  )

  if (to === null) return content
  return (
    <Link to={to} className="rounded transition-opacity hover:opacity-75">
      {content}
    </Link>
  )
}
