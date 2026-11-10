# Accessibility

Target: **WCAG 2.2 Level AA**.

## How this was checked

- axe-core (tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) at 1440×900, 390×844 and 320×800 on public routes, auth forms (including validation errors), the apply picker, and organizer console views after signing in with the seeded demo accounts.
- Manual checks: keyboard operation and focus order, visible focus, skip link, landmarks and headings, page `lang`/`title`, form labels and errors, dialog behaviour on the opening crawl, live regions for autosave, colour-independent status, reflow at 320 px, target size, and `prefers-reduced-motion` (starfield static paint, crawl skipped, ticker paused under reduced motion and manually pausable otherwise).

## Known limitations

- The organizer applications table keeps a horizontal scroll region below ~62 rem so dense columns stay usable; that is deliberate data-table overflow, not full single-column reflow.
- Decorative canvas sky and badge physics are hidden from the accessibility tree; meaningful copy is always available in the document.
- Blind-review identity redaction is a product privacy control, not an accessibility feature.

## Report a barrier

Open a GitHub issue on [KarthikSubramanian07/not-cal-hacks](https://github.com/KarthikSubramanian07/not-cal-hacks) with the page, the barrier, and your browser / assistive technology.
