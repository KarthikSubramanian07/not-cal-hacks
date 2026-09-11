import { Link } from 'react-router'
import { cn } from '@/lib/utils'

/**
 * The wordmark is the repository name, lowercase and hyphenated. It should look
 * like something a developer typed rather than something an agency approved,
 * and the joke lives in the first syllable.
 */
export function Wordmark({ className, to = '/' }: { className?: string; to?: string | null }) {
  const content = (
    <span className={cn('text-[15px] font-medium tracking-[-0.02em] text-fg', className)}>
      not-cal-hacks
    </span>
  )

  if (to === null) return content
  return (
    <Link to={to} className="rounded transition-opacity hover:opacity-70">
      {content}
    </Link>
  )
}
