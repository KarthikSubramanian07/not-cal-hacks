import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import type { Calibration, QueueResponse } from '@shared/api'
import { MAX_TOTAL_SCORE, RUBRIC_CRITERIA, type RubricCriterion } from '@shared/constants'
import { ApplicationView } from '@/components/admin/application-view'
import { EMPTY_SCORES, Rubric, type Scores } from '@/components/admin/rubric'
import { StatusBadge, TypeBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/field'
import { EmptyState, Skeleton } from '@/components/ui/surface'
import { api, ApiClientError } from '@/lib/api'
import { useHotkey, useLocalStorage, useReducedMotion } from '@/lib/hooks'
import { cn, formatScore } from '@/lib/utils'

/**
 * The review queue.
 *
 * One application at a time, chosen by the server as the least-reviewed one
 * this organizer has not seen. Everything here is built to remove decisions
 * that are not "what score": no list to pick from, no save-and-then-navigate,
 * and a keyboard path that never needs the mouse.
 */
export function AdminReview() {
  const [blind, setBlind] = useLocalStorage('nch:blind', true)
  const [data, setData] = useState<QueueResponse | null>(null)
  const [scores, setScores] = useState<Scores>(EMPTY_SCORES)
  const [comment, setComment] = useState('')
  const [focused, setFocused] = useState<RubricCriterion>('technical')
  const [saving, setSaving] = useState(false)
  const reduced = useReducedMotion()

  const load = useCallback(async () => {
    try {
      const res = await api.get<QueueResponse>(`/admin/queue?blind=${blind ? '1' : '0'}`)
      setData(res)
      // Reset the form for the incoming application, not the outgoing one.
      setScores(
        res.application?.myReview
          ? {
              technical: res.application.myReview.technical,
              passion: res.application.myReview.passion,
              fit: res.application.myReview.fit,
            }
          : EMPTY_SCORES,
      )
      setComment(res.application?.myReview?.comment ?? '')
      setFocused('technical')
    } catch {
      toast.error('Could not load the queue.')
    }
  }, [blind])

  useEffect(() => {
    void load()
  }, [load])

  const submit = useCallback(async () => {
    const application = data?.application
    if (!application || saving) return
    setSaving(true)
    try {
      await api.post('/admin/reviews', {
        applicationId: application.id,
        technical: scores.technical,
        passion: scores.passion,
        fit: scores.fit,
        comment: comment.trim() || undefined,
      })
      await load()
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : 'Could not save that review.')
    } finally {
      setSaving(false)
    }
  }, [data, scores, comment, saving, load])

  // Number keys score the focused criterion. They still fire while the comment
  // box has focus? No: plain keys are ignored while typing, by design.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return

      const value = Number(event.key)
      if (Number.isInteger(value) && value >= 1 && value <= 5) {
        event.preventDefault()
        setScores((prev) => ({ ...prev, [focused]: value }))
        // Advance to the next criterion so 4-5-3 scores a whole application.
        const index = RUBRIC_CRITERIA.indexOf(focused)
        const next = RUBRIC_CRITERIA[index + 1]
        if (next) setFocused(next)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focused])

  useHotkey({ key: 'Enter', meta: true }, () => void submit())

  const application = data?.application ?? null

  return (
    <div className="px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="telemetry">Queue</p>
          <h1 className="display-lg mt-2">Review next</h1>
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

      {data ? <CalibrationStrip calibration={data.calibration} remaining={data.remaining} /> : null}

      {data === null ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : application === null ? (
        <EmptyState
          className="mt-8"
          title="Queue clear"
          body="You have reviewed every application available to you. Either the pile is genuinely empty or your colleagues are slower than you. It is one of those."
          action={
            <Button asChild>
              <Link to="/admin">Back to applications</Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* The card is keyed by id, so saving deals the next one in. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={application.id}
              initial={reduced ? false : { opacity: 0, x: 28, rotate: 1.4 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={reduced ? undefined : { opacity: 0, x: -44, rotate: -2 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="text-ion font-mono text-lg">#{application.alias}</span>
                <TypeBadge type={application.type} />
                <StatusBadge status={application.status} size="sm" />
                {application.applicantName ? (
                  <span className="text-fg-muted text-[14px]">{application.applicantName}</span>
                ) : null}
                {application.reviews.length > 0 ? (
                  <span className="text-fg-dim font-mono text-[11px]">
                    {application.reviews.length} review
                    {application.reviews.length === 1 ? '' : 's'} already
                  </span>
                ) : null}
              </div>

              <ApplicationView application={application} />
            </motion.div>
          </AnimatePresence>

          <div className="panel sticky top-6 p-6">
            <h2 className="text-[15px] font-medium">
              {application.myReview ? 'Update your review' : 'Score this application'}
            </h2>
            <p className="text-fg-dim mt-1 text-[12px]">
              Press 1 to 5 to score and move on. Command-Enter files it.
            </p>

            <div className="mt-5">
              <Rubric
                scores={scores}
                onChange={setScores}
                focused={focused}
                onFocusChange={setFocused}
                disabled={saving}
              />
            </div>

            <div className="mt-5">
              <label htmlFor="review-comment" className="text-fg-muted text-[13px]">
                Comment for the other reviewers
              </label>
              <Textarea
                id="review-comment"
                className="mt-2 min-h-24"
                maxLength={1000}
                placeholder="Optional. What would you want a second reader to notice?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <Button
              className="mt-4 w-full"
              size="lg"
              loading={saving}
              onClick={() => void submit()}
            >
              {application.myReview ? 'Update and continue' : 'File review and continue'}
            </Button>

            {application.reviews.length > 0 ? (
              <div className="border-line mt-6 border-t pt-5">
                <p className="telemetry mb-3">Other reviewers</p>
                <ul className="space-y-2.5">
                  {application.reviews.map((review) => (
                    <li key={review.id} className="text-[13px]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-fg-muted">{review.reviewerName}</span>
                        <span className="text-fg font-mono tabular-nums">
                          {review.total}/{MAX_TOTAL_SCORE}
                        </span>
                      </div>
                      {review.comment ? (
                        <p className="text-fg-dim mt-1 leading-relaxed text-pretty">
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
      )}
    </div>
  )
}

/**
 * Calibration.
 *
 * Shows this organizer's average beside the team's. It is deliberately quiet
 * and deliberately not a ranking: the goal is to let someone notice they have
 * been harsh for the last hour, not to score the scorers.
 */
function CalibrationStrip({
  calibration,
  remaining,
}: {
  calibration: Calibration
  remaining: number
}) {
  const mine = calibration.myAverage
  const team = calibration.teamAverage
  const drift = mine !== null && team !== null ? mine - team : null

  return (
    <div className="panel mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-3.5">
      <Stat label="Your average" value={formatScore(mine)} />
      <Stat label="Team average" value={formatScore(team)} />
      <Stat label="You have reviewed" value={String(calibration.myCount)} />
      <Stat label="Left in your queue" value={String(remaining)} tone="text-sodium" />

      {drift !== null && Math.abs(drift) >= 1 ? (
        <p className="text-fg-dim ml-auto text-[12px]">
          You are scoring {Math.abs(drift).toFixed(1)} points {drift > 0 ? 'higher' : 'lower'} than
          the team. Not a problem, just worth knowing.
        </p>
      ) : null}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="telemetry">{label}</p>
      <p className={cn('mt-0.5 font-mono text-lg tabular-nums', tone ?? 'text-fg')}>{value}</p>
    </div>
  )
}
