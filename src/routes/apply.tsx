import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import type { ApplicationWithTimeline } from '@shared/api'
import { APPLICATION_TYPES, APPLICATION_TYPE_META, type ApplicationType } from '@shared/constants'
import { SiteFooter, SiteNav } from '@/components/site-chrome'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/surface'
import { api } from '@/lib/api'

/**
 * Type picker.
 *
 * Each card reflects what actually exists for that type, so the same screen
 * works as a starting point and as a home base once something is in flight.
 */
export function ApplyPage() {
  const [applications, setApplications] = useState<ApplicationWithTimeline[] | null>(null)

  useEffect(() => {
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
  }, [])

  const byType = new Map((applications ?? []).map((a) => [a.type, a]))

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav />

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-16 sm:px-8">
        <p className="eyebrow">Step one</p>
        <h1 className="display-lg mt-4">What are you applying as?</h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-fg-muted">
          You can hold one application of each type. Doing both is allowed and slightly showy.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {applications === null
            ? APPLICATION_TYPES.map((type) => <Skeleton key={type} className="h-56" />)
            : APPLICATION_TYPES.map((type) => (
                <TypeCard key={type} type={type} application={byType.get(type)} />
              ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

function TypeCard({
  type,
  application,
}: {
  type: ApplicationType
  application: ApplicationWithTimeline | undefined
}) {
  const meta = APPLICATION_TYPE_META[type]
  const isDraft = application?.status === 'draft'
  const isSubmitted = application !== undefined && !isDraft

  const label = isSubmitted ? 'View application' : isDraft ? 'Continue draft' : `Apply as a ${type}`
  const href = isSubmitted ? '/status' : `/apply/${type}`

  return (
    <div className="tile flex h-full flex-col p-7">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-2xl tracking-[-0.03em]">{meta.label}</h2>
        {application ? <StatusBadge status={application.status} size="sm" /> : null}
      </div>

      <p className="mt-1 text-[13px] text-fg-dim">{meta.tagline}</p>
      <p className="mt-4 flex-1 text-[14px] leading-relaxed text-fg-muted text-pretty">
        {meta.blurb}
      </p>

      <Button asChild className="mt-7 w-full" variant={isSubmitted ? 'outline' : 'primary'}>
        <Link to={href}>
          {label}
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  )
}
