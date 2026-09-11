import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import type { ApplicationSummary } from '@shared/api'
import {
  APPLICATION_TYPE_META,
  AVAILABILITY,
  EXPERIENCE_LEVELS,
  EXPERTISE,
  LONG_ANSWER_MAX,
  TRACKS,
  TSHIRT_SIZES,
  type ApplicationType,
} from '@shared/constants'
import { answersSchemaFor, fieldErrors, type DraftAnswers } from '@shared/schemas'
import { SiteNav } from '@/components/site-chrome'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChipGroup, SegmentedControl, Toggle } from '@/components/ui/choice'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/surface'
import { api, ApiClientError } from '@/lib/api'
import { useDebouncedCallback } from '@/lib/hooks'
import { cn } from '@/lib/utils'

/** Which fields live in which section, used for both layout and error jumping. */
const SECTIONS: Record<
  ApplicationType,
  { id: string; title: string; blurb: string; fields: string[] }[]
> = {
  hacker: [
    {
      id: 'basics',
      title: 'The basics',
      blurb: 'Who you are and where we can find you.',
      fields: ['firstName', 'lastName', 'pronouns', 'school', 'gradYear', 'linkedin', 'github'],
    },
    {
      id: 'specifics',
      title: 'The specifics',
      blurb: 'What you study and what you want to build.',
      fields: ['major', 'experienceLevel', 'tracks', 'tshirtSize', 'dietary'],
    },
    {
      id: 'prose',
      title: 'The prose',
      blurb: 'The part we actually read twice.',
      fields: ['whyNotCalHacks', 'proudestProject'],
    },
  ],
  mentor: [
    {
      id: 'basics',
      title: 'The basics',
      blurb: 'Who you are and where we can find you.',
      fields: ['firstName', 'lastName', 'pronouns', 'school', 'gradYear', 'linkedin', 'github'],
    },
    {
      id: 'specifics',
      title: 'The specifics',
      blurb: 'What you can unblock and when you are around.',
      fields: ['company', 'role', 'expertise', 'yearsExperience', 'availability', 'mentoredBefore'],
    },
    {
      id: 'prose',
      title: 'The prose',
      blurb: 'The part we actually read twice.',
      fields: ['whyNotCalHacks'],
    },
  ],
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function ApplyFormPage() {
  const params = useParams()
  const navigate = useNavigate()
  const type = params.type as ApplicationType

  const [application, setApplication] = useState<ApplicationSummary | null>(null)
  const [answers, setAnswers] = useState<DraftAnswers>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sectionIndex, setSectionIndex] = useState(0)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  // Tracks whether the user has actually edited, so mounting does not autosave.
  const dirtyRef = useRef(false)

  const sections = SECTIONS[type] ?? []
  const readOnly = application !== null && application.status !== 'draft'

  useEffect(() => {
    let cancelled = false
    void api
      .post<{ application: ApplicationSummary }>('/applications', { type })
      .then((res) => {
        if (cancelled) return
        setApplication(res.application)
        setAnswers(res.application.answers ?? {})
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [type, navigate])

  const persist = useCallback(async (next: DraftAnswers, id: string) => {
    setSaveState('saving')
    try {
      await api.patch(`/applications/${id}`, { answers: next })
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }, [])

  // 800ms is long enough that a fast typist produces one request per pause and
  // short enough that "Saved" appears before anyone reaches for the tab close.
  const scheduleSave = useDebouncedCallback((next: DraftAnswers, id: string) => {
    void persist(next, id)
  }, 800)

  const setField = (name: string, value: DraftAnswers[string]) => {
    if (readOnly) return
    dirtyRef.current = true
    setAnswers((prev) => {
      const next = { ...prev, [name]: value }
      if (application) scheduleSave(next, application.id)
      return next
    })
    setErrors((prev) => {
      if (!(name in prev)) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const onSubmit = async () => {
    if (!application) return
    const parsed = answersSchemaFor(type).safeParse(answers)
    if (!parsed.success) {
      const next = fieldErrors(parsed.error)
      setErrors(next)
      const firstBad = Object.keys(next)[0]
      const index = sections.findIndex((s) => s.fields.includes(firstBad ?? ''))
      if (index >= 0) setSectionIndex(index)
      toast.error('A few answers still need work.')
      return
    }

    setSubmitting(true)
    try {
      // Flush any pending autosave first, so the server validates what the
      // person is actually looking at rather than the last debounced snapshot.
      await api.patch(`/applications/${application.id}`, { answers })
      await api.post(`/applications/${application.id}/submit`)
      toast.success('Submitted. We will be in touch.')
      void navigate('/status')
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.fields ?? {})
        toast.error(error.message)
      } else {
        toast.error('Could not submit. Try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const meta = APPLICATION_TYPE_META[type]
  const isReview = sectionIndex === sections.length
  const progress = Math.round((sectionIndex / sections.length) * 100)

  if (loadFailed) {
    return (
      <div className="relative z-10 min-h-dvh">
        <SiteNav />
        <main className="mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="text-2xl">Could not open that application</h1>
          <p className="text-fg-muted mt-3 text-sm">
            The server did not respond. Refreshing usually sorts it.
          </p>
          <Button asChild className="mt-6">
            <Link to="/apply">Back to the picker</Link>
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="relative z-10 min-h-dvh">
      <SiteNav />

      <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="telemetry">{meta.label} application</p>
            <h1 className="mt-2 text-3xl tracking-[-0.04em]">
              {readOnly ? 'Your submitted application' : meta.tagline}
            </h1>
          </div>
          {application ? <StatusBadge status={application.status} /> : null}
        </div>

        {/* Progress rail doubles as section navigation once a section is reached. */}
        <div className="mt-8">
          <div className="bg-line h-px w-full">
            <div
              className="bg-fg h-px transition-[width] duration-500 ease-[var(--ease-out-quint)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            {[...sections.map((s) => s.title), 'Review'].map((title, index) => (
              <button
                key={title}
                type="button"
                onClick={() => setSectionIndex(index)}
                className={cn(
                  'font-mono text-[11px] tracking-[0.1em] uppercase transition-colors',
                  index === sectionIndex ? 'text-fg' : 'text-fg-dim hover:text-fg-muted',
                )}
              >
                {String(index + 1).padStart(2, '0')} {title}
              </button>
            ))}
            <SaveIndicator state={saveState} readOnly={readOnly} />
          </div>
        </div>

        <div className="mt-10">
          {application === null ? (
            <div className="space-y-6">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : isReview ? (
            <ReviewSection
              type={type}
              answers={answers}
              errors={errors}
              readOnly={readOnly}
              submitting={submitting}
              onEdit={setSectionIndex}
              onSubmit={() => void onSubmit()}
            />
          ) : (
            <fieldset disabled={readOnly} className="space-y-1">
              <legend className="sr-only">{sections[sectionIndex]?.title}</legend>
              <h2 className="text-xl tracking-[-0.03em]">{sections[sectionIndex]?.title}</h2>
              <p className="text-fg-dim pb-4 text-sm">{sections[sectionIndex]?.blurb}</p>
              <FormFields
                type={type}
                fields={sections[sectionIndex]?.fields ?? []}
                answers={answers}
                errors={errors}
                setField={setField}
              />
            </fieldset>
          )}
        </div>

        {application !== null ? (
          <div className="border-line mt-10 flex items-center justify-between gap-3 border-t pt-6">
            <Button
              variant="ghost"
              onClick={() => setSectionIndex((i) => Math.max(0, i - 1))}
              disabled={sectionIndex === 0}
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>

            {isReview ? (
              <span className="text-fg-dim text-[13px]">
                {readOnly ? 'Submitted. This is now read-only.' : 'Everything above, then submit.'}
              </span>
            ) : (
              <Button onClick={() => setSectionIndex((i) => Math.min(sections.length, i + 1))}>
                Next
                <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        ) : null}
      </main>
    </div>
  )
}

function SaveIndicator({ state, readOnly }: { state: SaveState; readOnly: boolean }) {
  if (readOnly) return null
  return (
    <span className="text-fg-dim ml-auto inline-flex items-center gap-1.5 font-mono text-[11px]">
      {state === 'saving' ? (
        <>
          <Loader2 className="size-3 animate-spin" />
          Saving
        </>
      ) : state === 'saved' ? (
        <>
          <Check className="text-status-accepted size-3" />
          Saved
        </>
      ) : state === 'error' ? (
        <span className="text-status-rejected">Not saved</span>
      ) : (
        'Autosave on'
      )}
    </span>
  )
}

/** Renders the controls for one section. Field metadata lives here, once. */
function FormFields({
  type,
  fields,
  answers,
  errors,
  setField,
}: {
  type: ApplicationType
  fields: string[]
  answers: DraftAnswers
  errors: Record<string, string>
  setField: (name: string, value: DraftAnswers[string]) => void
}) {
  const str = (k: string) => (typeof answers[k] === 'string' ? (answers[k] as string) : '')
  const num = (k: string) => (typeof answers[k] === 'number' ? String(answers[k]) : '')
  const arr = (k: string) => (Array.isArray(answers[k]) ? (answers[k] as string[]) : [])

  const has = (name: string) => fields.includes(name)

  return (
    <div className="space-y-1">
      {has('firstName') || has('lastName') ? (
        <div className="grid gap-x-5 sm:grid-cols-2">
          <Field label="First name" error={errors.firstName} required>
            {(p) => (
              <Input
                {...p}
                value={str('firstName')}
                onChange={(e) => setField('firstName', e.target.value)}
              />
            )}
          </Field>
          <Field label="Last name" error={errors.lastName} required>
            {(p) => (
              <Input
                {...p}
                value={str('lastName')}
                onChange={(e) => setField('lastName', e.target.value)}
              />
            )}
          </Field>
        </div>
      ) : null}

      {has('pronouns') ? (
        <Field label="Pronouns" hint="Optional. We will use them." error={errors.pronouns}>
          {(p) => (
            <Input
              {...p}
              placeholder="they/them"
              value={str('pronouns')}
              onChange={(e) => setField('pronouns', e.target.value)}
            />
          )}
        </Field>
      ) : null}

      {has('school') ? (
        <div className="grid gap-x-5 sm:grid-cols-[1.6fr_1fr]">
          <Field label="School" error={errors.school} required>
            {(p) => (
              <Input
                {...p}
                placeholder="UC Berkeley"
                value={str('school')}
                onChange={(e) => setField('school', e.target.value)}
              />
            )}
          </Field>
          <Field label="Graduation year" error={errors.gradYear} required>
            {(p) => (
              <Input
                {...p}
                inputMode="numeric"
                placeholder="2028"
                value={num('gradYear')}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setField('gradYear', raw === '' ? null : Number(raw))
                }}
              />
            )}
          </Field>
        </div>
      ) : null}

      {has('linkedin') ? (
        <div className="grid gap-x-5 sm:grid-cols-2">
          <Field label="LinkedIn" hint="Optional" error={errors.linkedin}>
            {(p) => (
              <Input
                {...p}
                placeholder="linkedin.com/in/you"
                value={str('linkedin')}
                onChange={(e) => setField('linkedin', e.target.value)}
              />
            )}
          </Field>
          <Field label="GitHub" hint="Optional" error={errors.github}>
            {(p) => (
              <Input
                {...p}
                placeholder="github.com/you"
                value={str('github')}
                onChange={(e) => setField('github', e.target.value)}
              />
            )}
          </Field>
        </div>
      ) : null}

      {has('major') ? (
        <Field label="Major" error={errors.major} required>
          {(p) => (
            <Input
              {...p}
              placeholder="EECS, or undeclared"
              value={str('major')}
              onChange={(e) => setField('major', e.target.value)}
            />
          )}
        </Field>
      ) : null}

      {has('experienceLevel') ? (
        <Field label="Hackathons attended" error={errors.experienceLevel} required>
          {(p) => (
            <SegmentedControl
              id={p.id}
              options={EXPERIENCE_LEVELS}
              value={EXPERIENCE_LEVELS.find((v) => v === str('experienceLevel'))}
              onChange={(v) => setField('experienceLevel', v)}
              labels={{ first: 'This is my first', '1-2': 'One or two', '3+': 'Three or more' }}
            />
          )}
        </Field>
      ) : null}

      {has('tracks') ? (
        <Field
          label="Tracks"
          hint="Up to three. Picking everything tells us nothing."
          error={errors.tracks}
          required
        >
          {(p) => (
            <ChipGroup
              id={p.id}
              options={TRACKS}
              value={arr('tracks') as (typeof TRACKS)[number][]}
              onChange={(v) => setField('tracks', v)}
              max={3}
            />
          )}
        </Field>
      ) : null}

      {has('tshirtSize') ? (
        <Field label="T-shirt size" error={errors.tshirtSize} required>
          {(p) => (
            <SegmentedControl
              id={p.id}
              options={TSHIRT_SIZES}
              value={TSHIRT_SIZES.find((v) => v === str('tshirtSize'))}
              onChange={(v) => setField('tshirtSize', v)}
            />
          )}
        </Field>
      ) : null}

      {has('dietary') ? (
        <Field label="Dietary needs" hint="Optional. Taken seriously." error={errors.dietary}>
          {(p) => (
            <Input
              {...p}
              placeholder="Vegetarian, celiac, none"
              value={str('dietary')}
              onChange={(e) => setField('dietary', e.target.value)}
            />
          )}
        </Field>
      ) : null}

      {has('company') ? (
        <div className="grid gap-x-5 sm:grid-cols-2">
          <Field label="Company" error={errors.company} required>
            {(p) => (
              <Input
                {...p}
                value={str('company')}
                onChange={(e) => setField('company', e.target.value)}
              />
            )}
          </Field>
          <Field label="Role" error={errors.role} required>
            {(p) => (
              <Input
                {...p}
                value={str('role')}
                onChange={(e) => setField('role', e.target.value)}
              />
            )}
          </Field>
        </div>
      ) : null}

      {has('expertise') ? (
        <Field label="Expertise" hint="Up to four." error={errors.expertise} required>
          {(p) => (
            <ChipGroup
              id={p.id}
              options={EXPERTISE}
              value={arr('expertise') as (typeof EXPERTISE)[number][]}
              onChange={(v) => setField('expertise', v)}
              max={4}
            />
          )}
        </Field>
      ) : null}

      {has('yearsExperience') ? (
        <Field label="Years of experience" error={errors.yearsExperience} required>
          {(p) => (
            <Input
              {...p}
              inputMode="numeric"
              className="sm:max-w-32"
              value={num('yearsExperience')}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
                setField('yearsExperience', raw === '' ? null : Number(raw))
              }}
            />
          )}
        </Field>
      ) : null}

      {has('availability') ? (
        <Field
          label="Availability"
          hint="Overnight shifts are the ones we struggle to fill."
          error={errors.availability}
          required
        >
          {(p) => (
            <ChipGroup
              id={p.id}
              options={AVAILABILITY}
              value={arr('availability') as (typeof AVAILABILITY)[number][]}
              onChange={(v) => setField('availability', v)}
            />
          )}
        </Field>
      ) : null}

      {has('mentoredBefore') ? (
        <Field label="Mentored before?" error={errors.mentoredBefore}>
          {(p) => (
            <Toggle
              id={p.id}
              checked={answers.mentoredBefore === true}
              onChange={(v) => setField('mentoredBefore', v)}
              label="Yes, I have mentored at an event before"
            />
          )}
        </Field>
      ) : null}

      {has('whyNotCalHacks') ? (
        <Field
          label="Why not Cal Hacks?"
          hint="The name is a joke. The question is not."
          error={errors.whyNotCalHacks}
          count={{ value: str('whyNotCalHacks').length, max: LONG_ANSWER_MAX }}
          required
        >
          {(p) => (
            <Textarea
              {...p}
              maxLength={LONG_ANSWER_MAX}
              placeholder="Be specific. Specific is memorable."
              value={str('whyNotCalHacks')}
              onChange={(e) => setField('whyNotCalHacks', e.target.value)}
            />
          )}
        </Field>
      ) : null}

      {has('proudestProject') && type === 'hacker' ? (
        <Field
          label="The thing you are proudest of building"
          hint="It does not have to be impressive. It has to be yours."
          error={errors.proudestProject}
          count={{ value: str('proudestProject').length, max: LONG_ANSWER_MAX }}
          required
        >
          {(p) => (
            <Textarea
              {...p}
              maxLength={LONG_ANSWER_MAX}
              placeholder="What it does, why you made it, what broke."
              value={str('proudestProject')}
              onChange={(e) => setField('proudestProject', e.target.value)}
            />
          )}
        </Field>
      ) : null}
    </div>
  )
}

const LABELS: Record<string, string> = {
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
  whyNotCalHacks: 'Why not Cal Hacks?',
  proudestProject: 'Proudest project',
}

function ReviewSection({
  type,
  answers,
  errors,
  readOnly,
  submitting,
  onEdit,
  onSubmit,
}: {
  type: ApplicationType
  answers: DraftAnswers
  errors: Record<string, string>
  readOnly: boolean
  submitting: boolean
  onEdit: (index: number) => void
  onSubmit: () => void
}) {
  const sections = SECTIONS[type]
  const errorCount = useMemo(() => Object.keys(errors).length, [errors])

  const render = (value: DraftAnswers[string]) => {
    if (value === undefined || value === null || value === '') return null
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    return String(value)
  }

  return (
    <div>
      <h2 className="text-xl tracking-[-0.03em]">Review and submit</h2>
      <p className="text-fg-dim pb-6 text-sm">
        {readOnly
          ? 'This is what was submitted. It can no longer be edited.'
          : 'Last look. After this it locks.'}
      </p>

      <div className="space-y-6">
        {sections.map((section, index) => (
          <div key={section.id} className="panel p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-medium">{section.title}</h3>
              {readOnly ? null : (
                <button
                  type="button"
                  onClick={() => onEdit(index)}
                  className="text-fg-muted decoration-line-strong hover:text-fg text-[13px] underline underline-offset-4"
                >
                  Edit
                </button>
              )}
            </div>
            <dl className="mt-4 space-y-3">
              {section.fields.map((field) => {
                const value = render(answers[field])
                const error = errors[field]
                return (
                  <div key={field} className="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-4">
                    <dt className="text-fg-dim text-[13px]">{LABELS[field] ?? field}</dt>
                    <dd
                      className={cn(
                        'text-[14px] leading-relaxed text-pretty',
                        error ? 'text-status-rejected' : value ? 'text-fg' : 'text-fg-dim',
                      )}
                    >
                      {error ?? value ?? 'Not answered'}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </div>
        ))}
      </div>

      {readOnly ? null : (
        <div className="mt-8">
          <Button size="lg" className="w-full" loading={submitting} onClick={onSubmit}>
            Submit application
          </Button>
          <p className="text-fg-dim mt-3 text-center text-[12px]">
            {errorCount > 0
              ? `${errorCount} answer${errorCount === 1 ? '' : 's'} still need attention.`
              : 'By submitting you affirm this is true to the best of your 3am recollection.'}
          </p>
        </div>
      )}
    </div>
  )
}
