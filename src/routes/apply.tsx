import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Gavel, Shield, Wrench } from 'lucide-react'
import type { ApplicationWithTimeline } from '@shared/api'
import type { ApplicationType } from '@shared/constants'
import {
  PORTAL_INTENT_META,
  PORTAL_INTENTS,
  loginPathForIntent,
  pathForIntent,
  type PortalIntent,
} from '@shared/portal'
import { SiteFooter, SiteNav } from '@/components/site-chrome'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/surface'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

const INTENT_ICON = {
  hacker: Wrench,
  judge: Gavel,
  organizer: Shield,
} as const

/**
 * The three doors.
 *
 * Public on purpose: Apply must show hacker, judge and organizer before anyone
 * is asked for a password. Signed-in visitors see the live status of whatever
 * they already started.
 */
export function ApplyPage() {
  const { user, loading } = useAuth()
  const [applications, setApplications] = useState<ApplicationWithTimeline[] | null>(null)

  useEffect(() => {
    if (!user) {
      setApplications([])
      return
    }
    let cancelled = false
    void api
      .get<{ applications: ApplicationWithTimeline[] }>('/applications')
      .then((res) => {
        if (!cancelled) setApplications(res.applications)
      })
      .catch(() => {
        if (!cancelled) setApplications([])
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const byType = new Map((applications ?? []).map((a) => [a.type, a]))
  const ready = !loading && (user === null || applications !== null)

  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <SiteNav />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-16 sm:px-8">
        <p className="telemetry">Three doors</p>
        <h1 className="display-lg mt-4">How are you walking in?</h1>
        <p className="text-fg-muted mt-4 max-w-2xl text-[15px] leading-relaxed">
          Hacker and judge each have their own application. Organizer is the review console — that
          account is granted, not requested. Pick one. You can hold both applications on the same
          login.
        </p>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {!ready
            ? PORTAL_INTENTS.map((intent) => <Skeleton key={intent} className="h-72" />)
            : PORTAL_INTENTS.map((intent) => (
                <DoorCard
                  key={intent}
                  intent={intent}
                  signedIn={user !== null}
                  isOrganizer={user?.role === 'organizer'}
                  application={
                    intent === 'organizer' ? undefined : byType.get(intent as ApplicationType)
                  }
                />
              ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

function DoorCard({
  intent,
  signedIn,
  isOrganizer,
  application,
}: {
  intent: PortalIntent
  signedIn: boolean
  isOrganizer: boolean
  application: ApplicationWithTimeline | undefined
}) {
  const meta = PORTAL_INTENT_META[intent]
  const Icon = INTENT_ICON[intent]
  const isDraft = application?.status === 'draft'
  const isSubmitted = application !== undefined && !isDraft

  let href: string
  let label: string
  let primary = true

  if (intent === 'organizer') {
    href = signedIn && isOrganizer ? '/admin' : loginPathForIntent('organizer')
    label = signedIn && isOrganizer ? meta.loggedInCta : meta.loggedOutCta
    primary = false
  } else if (!signedIn) {
    href = loginPathForIntent(intent)
    label = meta.loggedOutCta
  } else if (isSubmitted) {
    href = '/status'
    label = 'View application'
    primary = false
  } else if (isDraft) {
    href = pathForIntent(intent, 'applicant')
    label = 'Continue draft'
  } else {
    href = pathForIntent(intent, 'applicant')
    label = meta.loggedInCta
  }

  return (
    <div
      className={cn(
        'panel flex h-full flex-col p-7',
        intent === 'organizer' && 'border-line-strong/80',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="border-line text-sodium inline-flex size-10 items-center justify-center rounded-full border">
          <Icon className="size-4" aria-hidden />
        </span>
        {application ? <StatusBadge status={application.status} size="sm" /> : null}
        {intent === 'organizer' && isOrganizer ? (
          <span className="border-line text-status-accepted rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Signed in
          </span>
        ) : null}
      </div>

      <h2 className="mt-5 text-2xl tracking-[-0.03em]">{meta.label}</h2>
      <p className="text-fg-dim mt-1 text-[13px]">{meta.tagline}</p>
      <p className="text-fg-muted mt-4 flex-1 text-[14px] leading-relaxed text-pretty">
        {meta.blurb}
      </p>

      <Button asChild className="mt-7 w-full" variant={primary ? 'primary' : 'outline'}>
        <Link to={href}>
          {label}
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  )
}
