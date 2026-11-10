/**
 * First focusable control in the tab order. Lands on `#main-content`, which
 * every page's primary landmark carries.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="bg-fg text-ink focus:ring-ion sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:ring-2 focus:outline-none"
    >
      Skip to content
    </a>
  )
}
