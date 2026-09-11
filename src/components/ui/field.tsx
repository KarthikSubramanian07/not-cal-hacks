import { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

const controlBase =
  'w-full rounded-xl border border-line bg-surface-2 px-4 text-fg placeholder:text-fg-dim/70 transition-colors duration-150 hover:border-line-strong focus:border-white/35 focus:outline-none focus:ring-2 focus:ring-white/15 disabled:opacity-50 aria-[invalid=true]:border-status-rejected/70'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlBase, 'h-12', className)} {...props} />
  },
)

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(controlBase, 'min-h-32 resize-y py-3 leading-relaxed', className)}
      {...props}
    />
  )
})

interface FieldProps {
  label: string
  /** Rendered under the label. Use for the "why we ask" half-sentence. */
  hint?: string
  error?: string
  required?: boolean
  /** Shows a live character count against the limit. */
  count?: { value: number; max: number }
  children: (props: {
    id: string
    'aria-invalid': boolean
    'aria-describedby': string
  }) => React.ReactNode
  className?: string
}

/**
 * One wrapper for every form control.
 *
 * It owns the label association, the error text and the describedby wiring, so
 * no individual input can accidentally ship without them.
 */
export function Field({ label, hint, error, required, count, children, className }: FieldProps) {
  const id = useId()
  const describedBy = `${id}-desc`

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-fg text-sm font-medium">
          {label}
          {required ? <span className="text-fg-dim ml-1">*</span> : null}
        </label>
        {count ? (
          <span
            className={cn(
              'font-mono text-[11px] tabular-nums',
              count.value > count.max ? 'text-status-rejected' : 'text-fg-dim',
            )}
          >
            {count.value}/{count.max}
          </span>
        ) : null}
      </div>

      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}

      <p id={describedBy} className="min-h-[1.1rem] text-[13px] leading-snug">
        {error ? (
          <span className="text-status-rejected">{error}</span>
        ) : hint ? (
          <span className="text-fg-dim">{hint}</span>
        ) : null}
      </p>
    </div>
  )
}
