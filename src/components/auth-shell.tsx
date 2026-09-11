import { Link } from 'react-router'
import { BadgeCard } from '@/components/badge/badge-card'
import { Wordmark } from '@/components/wordmark'

/**
 * Shared frame for sign in and sign up.
 *
 * The badge sits alongside the form as a reminder of what the form is for. It
 * is static here rather than simulated: a page whose job is a password field
 * should not have a toy competing for the cursor.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_0.85fr]">
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Wordmark />

        <div className="flex flex-1 items-center py-12">
          <div className="mx-auto w-full max-w-sm">
            <h1 className="text-[34px] tracking-[-0.04em]">{title}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">{subtitle}</p>
            <div className="mt-9">{children}</div>
            <div className="mt-7 text-sm text-fg-muted">{footer}</div>
          </div>
        </div>

        <p className="font-mono text-[11px] text-fg-dim">
          <Link to="/" className="transition-colors hover:text-fg-muted">
            &larr; Back to the front page
          </Link>
        </p>
      </div>

      <aside className="relative hidden items-center justify-center overflow-hidden border-l border-line bg-surface-2 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.13] blur-[120px]"
          style={{ background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.5) 0%, transparent 62%)' }}
        />
        <div className="relative -rotate-[5deg]">
          <BadgeCard name="Your Name" role="Applicant" code="0000" />
        </div>
        <p className="absolute bottom-10 left-1/2 max-w-xs -translate-x-1/2 text-center font-mono text-[11px] leading-relaxed text-fg-dim">
          One account. Up to one application per type. No second form, ever.
        </p>
      </aside>
    </div>
  )
}
