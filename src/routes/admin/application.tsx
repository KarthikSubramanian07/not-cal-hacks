import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import type { AdminApplicationDetail } from '@shared/api'
import {
  DECISION_STATUSES,
  MAX_TOTAL_SCORE,
  STATUS_META,
  type ApplicationStatus,
  type RubricCriterion,
} from '@shared/constants'
import { ApplicationView } from '@/components/admin/application-view'
import { EMPTY_SCORES, Rubric, type Scores } from '@/components/admin/rubric'
import { StatusBadge, TypeBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/surface'
import { api, ApiClientError } from '@/lib/api'
import { useLocalStorage } from '@/lib/hooks'
import { cn, formatDateTime } from '@/lib/utils'

/**
 * One application, in full.
 *
 * This is the deliberate view: reached from the table when someone wants to
 * look at a specific person rather than whatever the queue hands them. It is
 * the only place a decision can be changed alongside the whole text.
 */
export function AdminApplication() {
  const { id } = useParams()
  const [blind, setBlind] = useLocalStorage('nch:blind', true)
  const [application, setApplication] = useState<AdminApplicationDetail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [scores, setScores] = useState<Scores>(EMPTY_SCORES)
  const [comment, setComment] = useState('')
  const [focused, setFocused] = useState<RubricCriterion>('technical')
  const [saving, setSaving] = useState(false)
  const [deciding, setDeciding] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const res = await api.get<{ application: AdminApplicationDetail }>(
        `/admin/applications/${id}?blind=${blind ? '1' : '0'}`,
      )
      setApplication(res.application)
      if (res.application.myReview) {
        setScores({
          technical: res.application.myReview.technical,
          passion: res.application.myReview.passion,
          fit: res.application.myReview.fit,
        })
        setComment(res.application.myReview.comment ?? '')
      }
    } catch {
      setNotFound(true)
    }
  }, [id, blind])

  useEffect(() => {
    void load()
  }, [load])

  const saveReview = async () => {
    if (!application) return
    setSaving(true)
    try {
      await api.post('/admin/reviews', {
        applicationId: application.id,
        technical: scores.technical,
        passion: scores.passion,
        fit: scores.fit,
        comment: comment.trim() || undefined,
      })
      toast.success('Review saved.')
      await load()
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : 'Could not save that review.')
    } finally {
      setSaving(false)
    }
  }

  const decide = async (status: ApplicationStatus) => {
    if (!application) return
    setDeciding(true)
    try {
      await api.patch(`/admin/applications/${application.id}/status`, { status })
      toast.success(`Marked ${STATUS_META[status].label.toLowerCase()}.`)
      await load()
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : 'Could not save that decision.')
    } finally {
      setDeciding(false)
    }
  }

  if (notFound) {
    return (
      <div className="px-5 py-16 text-center sm:px-8">
        <h1 className="text-2xl">No such application</h1>
        <Button asChild className="mt-6">
          <Link to="/admin">Back to applications</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="px-5 py-10 sm:px-8">
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 text-[13px] text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        All applications
      </Link>

      {application === null ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl tracking-[-0.035em]">
                {application.applicantName ?? `Applicant #${application.alias}`}
              </h1>
              <TypeBadge type={application.type} />
              <StatusBadge status={application.status} size="sm" />
            </div>

            <button
              type="button"
              onClick={() => setBlind(!blind)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 font-mono text-[11px] tracking-[0.08em] uppercase transition-colors',
                blind
                  ? 'border-status-accepted/40 text-status-accepted'
                  : 'border-line-strong text-fg-muted hover:text-fg',
              )}
            >
              {blind ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {blind ? 'Blind on' : 'Identity shown'}
            </button>
          </div>

          {application.applicantEmail ? (
            <p className="mt-1 font-mono text-[12px] text-fg-dim">{application.applicantEmail}</p>
          ) : null}

          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
            <ApplicationView application={application} />

            <div className="space-y-6 lg:sticky lg:top-6">
              {application.status !== 'draft' ? (
                <div className="panel p-6">
                  <h2 className="text-[15px] font-medium">
                    {application.myReview ? 'Your review' : 'Score this application'}
                  </h2>
                  <div className="mt-5">
                    <Rubric
                      scores={scores}
                      onChange={setScores}
                      focused={focused}
                      onFocusChange={setFocused}
                      disabled={saving}
                    />
                  </div>
                  <Textarea
                    className="mt-5 min-h-24"
                    maxLength={1000}
                    placeholder="Optional comment for the other reviewers"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <Button className="mt-4 w-full" loading={saving} onClick={() => void saveReview()}>
                    {application.myReview ? 'Update review' : 'Save review'}
                  </Button>
                </div>
              ) : null}

              {application.status !== 'draft' ? (
                <div className="panel p-6">
                  <h2 className="text-[15px] font-medium">Decision</h2>
                  <p className="mt-1 text-[12px] text-fg-dim">
                    Reversible. A waitlist that cannot be promoted is not a waitlist.
                  </p>
                  <div className="mt-4 grid gap-2">
                    {DECISION_STATUSES.map((decision) => (
                      <button
                        key={decision}
                        type="button"
                        disabled={deciding || application.status === decision}
                        onClick={() => void decide(decision)}
                        className={cn(
                          'rounded-xl border px-4 py-2.5 text-left text-[14px] transition-colors',
                          application.status === decision
                            ? 'border-line-strong bg-white/[0.07] text-fg'
                            : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
                        )}
                      >
                        {STATUS_META[decision].label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {application.reviews.length > 0 ? (
                <div className="panel p-6">
                  <p className="telemetry mb-4">
                    {application.reviews.length} review
                    {application.reviews.length === 1 ? '' : 's'}
                  </p>
                  <ul className="space-y-4">
                    {application.reviews.map((review) => (
                      <li key={review.id} className="border-b border-line/60 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[14px] text-fg">{review.reviewerName}</span>
                          <span className="font-mono text-[14px] tabular-nums text-fg">
                            {review.total}/{MAX_TOTAL_SCORE}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-fg-dim">
                          T {review.technical} &middot; P {review.passion} &middot; F {review.fit}
                          {' · '}
                          {formatDateTime(review.createdAt)}
                        </p>
                        {review.comment ? (
                          <p className="mt-2 text-[13px] leading-relaxed text-fg-muted text-pretty">
                            {review.comment}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
