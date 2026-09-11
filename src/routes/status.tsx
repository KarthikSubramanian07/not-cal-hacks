import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import type { ApplicationWithTimeline, StatusEvent } from '@shared/api'
import { APPLICATION_TYPE_META, STATUS_META, type ApplicationStatus } from '@shared/constants'
import { BadgeCard } from '@/components/badge/badge-card'
import { SiteFooter, SiteNav } from '@/components/site-chrome'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, Skeleton } from '@/components/ui/surface'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useReducedMotion } from '@/lib/hooks'
import { cn, formatDateTime } from '@/lib/utils'

/** Copy for the moment a decision lands. Warm, specific, never a form letter. */
const DECISION_COPY: Partial<Record<ApplicationStatus, { title: string; body: string }>> = {
  accepted: {
    title: 'You are in',
    body: 'Your badge is printed below. Bring a laptop, a charger, and something you actually want to build.',
  },
  waitlisted: {
    title: 'A real maybe',
    body: 'Not a polite no. Plans change constantly in the last two weeks and the waitlist moves more than anyone expects.',
  },
  rejected: {
    title: 'Not this round',
    body: 'This says nothing about what you can build. It says we had more people than tables. Come back next time.',
  },
}

export function StatusPage() {
  const { user } = useAuth()
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

  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <SiteNav />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-14 sm:px-8">
        <p className="telemetry">Tracking</p>
        <h1 className="display-lg mt-3">Where things stand</h1>
        <p className="measure mt-4 text-[15px] leading-relaxed text-fg-muted">
          Everything you have filed, and exactly where it sits. This page is built from the audit
          trail, so it cannot tell you something different from what the organizers see.
        </p>

        <div className="mt-10 space-y-6">
          {applications === null ? (
            <>
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </>
          ) : applications.length === 0 ? (
            <EmptyState
              title="Nothing filed yet"
              body="You have an account but no applications. The form takes about five minutes and saves as you type."
              action={
                <Button asChild>
                  <Link to="/apply">Start an application</Link>
                </Button>
              }
            />
          ) : (
            applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                fallbackName={user?.fullName ?? 'Applicant'}
              />
            ))
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

function ApplicationCard({
  application,
  fallbackName,
}: {
  application: ApplicationWithTimeline
  fallbackName: string
}) {
  const meta = APPLICATION_TYPE_META[application.type]
  const decision = DECISION_COPY[application.status]
  const answers = application.answers
  const first = typeof answers.firstName === 'string' ? answers.firstName : ''
  const last = typeof answers.lastName === 'string' ? answers.lastName : ''
  const name = `${first} ${last}`.trim() || fallbackName

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-6">
        <div>
          <p className="telemetry">{meta.label} application</p>
          <h2 className="mt-2 text-2xl">{STATUS_META[application.status].label}</h2>
          <p className="measure mt-2 text-[14px] leading-relaxed text-fg-muted">
            {STATUS_META[application.status].applicantCopy}
          </p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      <div className="grid gap-8 p-6 sm:grid-cols-[1fr_auto]">
        <div>
          {decision ? (
            <div className="mb-7">
              <h3 className="text-lg">{decision.title}</h3>
              <p className="measure mt-2 text-[14px] leading-relaxed text-fg-muted text-pretty">
                {decision.body}
              </p>
            </div>
          ) : null}

          <p className="telemetry mb-4">Flight path</p>
          <Timeline events={application.events} />

          {application.status === 'draft' ? (
            <Button asChild className="mt-7">
              <Link to={`/apply/${application.type}`}>Continue draft</Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="mt-7">
              <Link to={`/apply/${application.type}`}>View what you submitted</Link>
            </Button>
          )}
        </div>

        {/* Your badge, for real this time. It only gets stamped once you are in. */}
        <div className="justify-self-center sm:justify-self-end">
          <div className="scale-90 sm:scale-100">
            <BadgeCard
              name={name}
              role={application.type}
              code={application.id.slice(0, 4).toUpperCase()}
              stamp={
                application.status === 'accepted'
                  ? 'ADMITTED'
                  : application.status === 'rejected'
                    ? 'NOT THIS TIME'
                    : application.status === 'waitlisted'
                      ? 'STANDBY'
                      : application.status === 'draft'
                        ? 'DRAFT'
                        : null
              }
              stampTone={
                application.status === 'accepted'
                  ? 'accepted'
                  : application.status === 'rejected'
                    ? 'declined'
                    : 'pending'
              }
            />
          </div>
        </div>
      </div>
    </section>
  )
}

const EVENT_LABEL: Record<ApplicationStatus, string> = {
  draft: 'Draft created',
  submitted: 'Submitted',
  under_review: 'Under review',
  accepted: 'Accepted',
  waitlisted: 'Waitlisted',
  rejected: 'Decision made',
}

function Timeline({ events }: { events: StatusEvent[] }) {
  const reduced = useReducedMotion()

  if (events.length === 0) {
    return <p className="text-[14px] text-fg-dim">No history yet.</p>
  }

  return (
    <ol className="relative space-y-5 pl-6">
      {/* The path itself. */}
      <span aria-hidden className="absolute top-1.5 bottom-1.5 left-[5px] w-px bg-line-strong" />

      {events.map((event, index) => {
        const isLast = index === events.length - 1
        return (
          <motion.li
            key={event.id}
            className="relative"
            initial={reduced ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <span
              aria-hidden
              className={cn(
                'absolute top-1.5 -left-6 size-[11px] rounded-full border-2',
                isLast
                  ? 'border-sodium bg-sodium shadow-[0_0_12px_var(--color-sodium)]'
                  : 'border-line-strong bg-ink',
              )}
            />
            <p className={cn('text-[14px]', isLast ? 'text-fg' : 'text-fg-muted')}>
              {EVENT_LABEL[event.toStatus]}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-fg-dim">
              {formatDateTime(event.createdAt)}
            </p>
          </motion.li>
        )
      })}
    </ol>
  )
}
