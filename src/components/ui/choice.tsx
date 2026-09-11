import { Select as RadixSelect } from 'radix-ui'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Chip multi-select.
 *
 * Used for tracks, expertise and availability. A row of chips shows every
 * option at once, which a multi-select dropdown never does, and the lists here
 * are short enough that hiding them would only add a click.
 */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  max,
  id,
  labels,
}: {
  options: readonly T[]
  value: readonly T[]
  onChange: (next: T[]) => void
  max?: number
  id?: string
  labels?: Partial<Record<T, string>>
}) {
  const atLimit = max !== undefined && value.length >= max

  return (
    <div id={id} role="group" className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option)
        const disabled = !selected && atLimit
        return (
          <button
            key={option}
            type="button"
            role="checkbox"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(selected ? value.filter((v) => v !== option) : [...value, option])}
            className={cn(
              'rounded-full border px-4 py-2 text-sm transition-all duration-200 ease-[var(--ease-out-quint)] active:scale-[0.97]',
              selected
                ? 'border-white/30 bg-white/[0.09] text-fg'
                : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
              disabled && 'cursor-not-allowed opacity-35 hover:border-line',
            )}
          >
            {labels?.[option] ?? option}
          </button>
        )
      })}
    </div>
  )
}

/** Single-choice row. Same visual language as ChipGroup, different semantics. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  id,
  labels,
}: {
  options: readonly T[]
  value: T | undefined
  onChange: (next: T) => void
  id?: string
  labels?: Partial<Record<T, string>>
}) {
  return (
    <div id={id} role="radiogroup" className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={cn(
              'rounded-full border px-4 py-2 text-sm transition-all duration-200 ease-[var(--ease-out-quint)] active:scale-[0.97]',
              selected
                ? 'border-white/30 bg-white/[0.09] text-fg'
                : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
            )}
          >
            {labels?.[option] ?? option}
          </button>
        )
      })}
    </div>
  )
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select',
  id,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: {
  options: readonly { value: string; label: string }[]
  value: string | undefined
  onChange: (next: string) => void
  placeholder?: string
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}) {
  return (
    <RadixSelect.Root value={value ?? ''} onValueChange={onChange}>
      <RadixSelect.Trigger
        id={id}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-line bg-surface-2 px-4 text-left text-fg transition-colors hover:border-line-strong focus:border-white/35 focus:outline-none focus:ring-2 focus:ring-white/15 aria-[invalid=true]:border-status-rejected/70 data-[placeholder]:text-fg-dim/70"
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown className="size-4 text-fg-dim" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-line-strong bg-surface shadow-2xl shadow-black/60"
        >
          <RadixSelect.Viewport className="p-1.5">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm text-fg-muted outline-none select-none data-[highlighted]:bg-white/[0.07] data-[highlighted]:text-fg data-[state=checked]:text-fg"
              >
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check className="size-4 text-fg" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  id?: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex items-center gap-3 text-left"
    >
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200',
          checked ? 'border-white/30 bg-white/20' : 'border-line-strong bg-surface-2',
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 size-4 -translate-y-1/2 rounded-full transition-all duration-300 ease-[var(--ease-spring)]',
            checked ? 'left-[22px] bg-fg' : 'left-[3px] bg-fg-dim',
          )}
        />
      </span>
      <span className="text-sm text-fg-muted transition-colors group-hover:text-fg">{label}</span>
    </button>
  )
}
