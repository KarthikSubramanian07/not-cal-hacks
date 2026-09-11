import { useRef, type ReactNode } from 'react'
import { useReducedMotion } from '@/lib/hooks'
import { cn } from '@/lib/utils'

/**
 * A surface that lights up under the cursor.
 *
 * The pointer position is written to CSS custom properties on the element and a
 * radial highlight reads them, so tracking costs one style write per move and no
 * React render. Every panel in the product uses this, which is what makes the
 * page feel alive rather than printed.
 */
export function Spotlight({
  children,
  className,
  as: Tag = 'div',
  strength = 0.07,
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'article' | 'section' | 'li'
  strength?: number
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const reduced = useReducedMotion()

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (reduced) return
    const node = ref.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    node.style.setProperty('--spot-x', `${event.clientX - rect.left}px`)
    node.style.setProperty('--spot-y', `${event.clientY - rect.top}px`)
    node.style.setProperty('--spot-opacity', '1')
  }

  const onPointerLeave = () => {
    ref.current?.style.setProperty('--spot-opacity', '0')
  }

  return (
    <Tag
      ref={ref as never}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={cn('spotlight', className)}
      style={{ ['--spot-strength' as string]: String(strength) }}
    >
      {children}
    </Tag>
  )
}

/**
 * A control that leans toward the cursor.
 *
 * Used only on the handful of calls to action that matter. The pull is small on
 * purpose: it should register as responsiveness, not as a toy.
 */
export function Magnetic({
  children,
  className,
  pull = 0.28,
}: {
  children: ReactNode
  className?: string
  pull?: number
}) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const reduced = useReducedMotion()

  const onPointerMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (reduced) return
    const node = ref.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const dx = event.clientX - (rect.left + rect.width / 2)
    const dy = event.clientY - (rect.top + rect.height / 2)
    node.style.transform = `translate3d(${(dx * pull).toFixed(2)}px, ${(dy * pull).toFixed(2)}px, 0)`
  }

  const reset = () => {
    const node = ref.current
    if (node) node.style.transform = ''
  }

  return (
    <span
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      className={cn(
        'inline-block transition-transform duration-300 ease-[var(--ease-out-expo)]',
        className,
      )}
    >
      {children}
    </span>
  )
}
