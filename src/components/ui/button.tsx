import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const button = cva(
  'relative inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[transform,background-color,border-color,color,opacity] duration-200 ease-[var(--ease-out-quint)] disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]',
  {
    variants: {
      variant: {
        // Sodium amber is the only fill in the product, so the lit control is
        // always the one to press. The glow is the instrument, not decoration.
        primary: 'bg-sodium text-ink glow-sodium hover:bg-sodium-bright',
        outline:
          'border border-line-strong bg-white/[0.03] text-fg backdrop-blur-sm hover:border-white/30 hover:bg-white/[0.07]',
        ghost: 'text-fg-muted hover:bg-white/[0.06] hover:text-fg',
        danger:
          'border border-status-rejected/40 text-status-rejected hover:bg-status-rejected/10',
      },
      size: {
        sm: 'h-8 px-3.5 text-[13px]',
        md: 'h-10 px-5 text-sm',
        lg: 'h-12 px-6 text-[15px]',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild, loading, children, disabled, ...props },
  ref,
) {
  // Radix Slot merges props onto exactly one child, so in `asChild` mode the
  // button must forward that child untouched. Loading state is not available
  // there, which is fine: `asChild` is only used for links, which never load.
  if (asChild) {
    return (
      <Slot.Root className={cn(button({ variant, size }), className)} {...props}>
        {children}
      </Slot.Root>
    )
  }

  return (
    <button
      ref={ref}
      className={cn(button({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span
            aria-hidden
            className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          <span className="sr-only">Working</span>
        </>
      ) : null}
      {children}
    </button>
  )
})

export { button as buttonVariants }
