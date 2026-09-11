/**
 * Shown while a lazy route chunk loads.
 *
 * Deliberately almost nothing: a spinner that appears for 80ms is worse than a
 * quiet pause, so this only fades in if the wait is long enough to notice.
 */
export function RouteFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="animate-[fadeIn_200ms_ease-out_180ms_both] text-center">
        <div className="mx-auto size-5 animate-spin rounded-full border-2 border-line-strong border-t-fg" />
        <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
      </div>
    </div>
  )
}
