/**
 * The mark.
 *
 * An amber disc with a bar struck through it. At a glance it is the universal
 * "not" sign, which is the entire joke the product is named after; look again
 * and it is a sun going down behind a horizon, which is the world it lives in.
 * Two shapes, one idea, still legible at sixteen pixels.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="not-cal-hacks">
      <rect width="32" height="32" rx="8" fill="#121319" />
      <circle cx="16" cy="16" r="9" fill="#f0b357" />
      {/* The strike is cut out of the disc, not drawn over it. */}
      <rect
        x="2"
        y="14.1"
        width="28"
        height="3.8"
        rx="1.9"
        fill="#121319"
        transform="rotate(-32 16 16)"
      />
      <rect width="32" height="32" rx="8" fill="none" stroke="rgba(255,255,255,.12)" />
    </svg>
  )
}
