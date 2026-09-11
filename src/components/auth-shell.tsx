import { Link } from 'react-router'
import { BadgeCard } from '@/components/badge/badge-card'
import { DuneHorizon } from '@/components/space/dune-horizon'
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
    <div className="relative z-10 grid min-h-dvh lg:grid-cols-[1fr_0.85fr]">
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Wordmark />

        <div className="flex flex-1 items-center py-12">
          <div className="mx-auto w-full max-w-sm">
            <h1 className="text-[34px] tracking-[-0.04em]">{title}</h1>
            <p className="text-fg-muted mt-3 text-[15px] leading-relaxed">{subtitle}</p>
            <div className="mt-9">{children}</div>
            <div className="text-fg-muted mt-7 text-sm">{footer}</div>
          </div>
        </div>

        <p className="text-fg-dim font-mono text-[11px]">
          <Link to="/" className="hover:text-fg-muted transition-colors">
            &larr; Back to the front page
          </Link>
        </p>
      </div>

      <aside className="border-line relative hidden items-center justify-center overflow-hidden border-l lg:flex">
        <DuneHorizon className="top-0 bottom-0" />
        <div className="relative -rotate-[5deg]">
          <BadgeCard name="Your Name" role="Applicant" code="0000" />
        </div>
        <p className="text-fg-dim absolute bottom-10 left-1/2 max-w-xs -translate-x-1/2 text-center font-mono text-[11px] leading-relaxed">
          One account. Up to one application per type. No second form, ever.
        </p>
      </aside>
    </div>
  )
}
