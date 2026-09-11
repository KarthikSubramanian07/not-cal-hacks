import { RUBRIC_CRITERIA, RUBRIC_LABELS, SCORE_ANCHORS, SCORE_MAX, SCORE_MIN, type RubricCriterion } from '@shared/constants'
import { cn } from '@/lib/utils'

export type Scores = Record<RubricCriterion, number>

export const EMPTY_SCORES: Scores = { technical: 3, passion: 3, fit: 3 }

/**
 * The rubric.
 *
 * Five discrete buttons per criterion rather than a slider. A slider with five
 * stops is harder to hit precisely, harder to read at a glance, and cannot show
 * what each value means. These can be clicked, arrowed, or typed as 1 to 5 on
 * whichever row has focus.
 */
export function Rubric({
  scores,
  onChange,
  focused,
  onFocusChange,
  disabled,
}: {
  scores: Scores
  onChange: (next: Scores) => void
  focused: RubricCriterion
  onFocusChange: (next: RubricCriterion) => void
  disabled?: boolean
}) {
  const total = RUBRIC_CRITERIA.reduce((sum, key) => sum + scores[key], 0)

  return (
    <div className="space-y-5">
      {RUBRIC_CRITERIA.map((criterion) => {
        const meta = RUBRIC_LABELS[criterion]
        const active = focused === criterion
        return (
          <div
            key={criterion}
            role="group"
            aria-label={meta.label}
            tabIndex={0}
            onFocus={() => onFocusChange(criterion)}
            onKeyDown={(event) => {
              if (disabled) return
              if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                event.preventDefault()
                onChange({ ...scores, [criterion]: Math.min(SCORE_MAX, scores[criterion] + 1) })
              }
              if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                event.preventDefault()
                onChange({ ...scores, [criterion]: Math.max(SCORE_MIN, scores[criterion] - 1) })
              }
            }}
            className={cn(
              'rounded-xl border p-4 transition-colors outline-none',
              active ? 'border-line-strong bg-white/[0.04]' : 'border-line',
            )}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[14px] font-medium">{meta.label}</p>
              <p className="font-mono text-[11px] text-fg-dim">{SCORE_ANCHORS[scores[criterion]]}</p>
            </div>
            <p className="mt-1 text-[12px] text-fg-dim">{meta.help}</p>

            <div className="mt-3 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((value) => {
                const selected = scores[criterion] === value
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={disabled}
                    aria-label={`${meta.label}: ${value}`}
                    aria-pressed={selected}
                    onClick={() => {
                      onFocusChange(criterion)
                      onChange({ ...scores, [criterion]: value })
                    }}
                    className={cn(
                      'h-9 flex-1 rounded-lg border font-mono text-[13px] transition-all duration-150',
                      selected
                        ? 'border-sodium bg-sodium/20 text-fg'
                        : 'border-line text-fg-dim hover:border-line-strong hover:text-fg',
                      disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="flex items-center justify-between border-t border-line pt-4">
        <span className="telemetry">Total</span>
        <span className="font-mono text-2xl tabular-nums text-fg">{total}</span>
      </div>
    </div>
  )
}
