import type { AdminApplicationDetail } from '@shared/api'
import { LONG_ANSWER_MAX } from '@shared/constants'
import { cn } from '@/lib/utils'

/**
 * Renders a set of answers for an organizer.
 *
 * Short fields go in a definition grid, long prose gets its own block at a
 * readable measure. Reviewers read the essays; cramming them into a two-column
 * table is how you get people skimming.
 */

const SHORT_LABELS: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  pronouns: 'Pronouns',
  school: 'School',
  gradYear: 'Graduation year',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  major: 'Major',
  experienceLevel: 'Hackathons attended',
  tracks: 'Tracks',
  tshirtSize: 'T-shirt size',
  dietary: 'Dietary needs',
  company: 'Company',
  role: 'Role',
  expertise: 'Expertise',
  yearsExperience: 'Years of experience',
  availability: 'Availability',
  mentoredBefore: 'Mentored before',
}

const PROSE_FIELDS = [
  { key: 'whyNotCalHacks', label: 'Why not Cal Hacks?' },
  { key: 'proudestProject', label: 'Proudest project' },
] as const

export function ApplicationView({ application }: { application: AdminApplicationDetail }) {
  const answers = application.answers

  if (application.status === 'draft') {
    return (
      <div className="panel p-8 text-center">
        <p className="text-[15px] text-fg">This application has not been submitted</p>
        <p className="measure mx-auto mt-2 text-[14px] leading-relaxed text-fg-muted">
          Its contents stay private until the applicant hands it in. You can see that it exists so
          the funnel is honest, and nothing more.
        </p>
      </div>
    )
  }

  const render = (value: unknown) => {
    if (value === undefined || value === null || value === '') return null
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    return String(value)
  }

  const shortEntries = Object.entries(SHORT_LABELS)
    .map(([key, label]) => [key, label, render(answers[key])] as const)
    .filter(([, , value]) => value !== null)

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {shortEntries.map(([key, label, value]) => (
            <div key={key} className="flex justify-between gap-4 border-b border-line/60 pb-2.5">
              <dt className="text-[13px] text-fg-dim">{label}</dt>
              <dd className="text-right text-[14px] text-fg">{value}</dd>
            </div>
          ))}
        </dl>
        {application.blinded ? (
          <p className="mt-4 font-mono text-[11px] text-fg-dim">
            Name and profile links withheld. Blind mode is on.
          </p>
        ) : null}
      </div>

      {PROSE_FIELDS.map(({ key, label }) => {
        const value = render(answers[key])
        if (value === null) return null
        return (
          <div key={key} className="panel p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-[15px] font-medium">{label}</h3>
              <span
                className={cn(
                  'font-mono text-[11px] tabular-nums',
                  value.length > LONG_ANSWER_MAX ? 'text-status-rejected' : 'text-fg-dim',
                )}
              >
                {value.length}
              </span>
            </div>
            <p className="measure mt-3 text-[15px] leading-[1.7] text-fg-muted text-pretty">
              {value}
            </p>
          </div>
        )
      })}
    </div>
  )
}
