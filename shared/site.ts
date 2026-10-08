/**
 * Public product identity and agent-facing surface.
 *
 * Kept in `shared/` so the SPA, the Worker, static discovery files, and the
 * CLI all agree on the same URLs and vocabulary.
 */

export const SITE_ORIGIN = 'https://not-cal-hacks.pages.dev'
export const SITE_NAME = 'not-cal-hacks'
export const SITE_TAGLINE = 'Hackathon application portal'
export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`
export const SITE_DESCRIPTION =
  'A hackathon application portal for both sides of the table. Applicants apply once and track status; organizers review blind against a shared rubric and decide fast.'

/** HTML SPA routes that should receive the app shell (HTTP 200), not a 404. */
export const SPA_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/apply',
  '/apply/hacker',
  '/apply/judge',
  '/status',
  '/admin',
  '/admin/review',
  '/docs',
  '/developers',
  '/about',
  '/contact',
  '/privacy',
  '/pricing',
] as const

/** Public pages that have a first-class Markdown twin. */
export const MARKDOWN_PAGES = [
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/docs',
  '/developers',
  '/pricing',
] as const

export type MarkdownPage = (typeof MARKDOWN_PAGES)[number]

export function isSpaRoute(pathname: string): boolean {
  const path = normalizePath(pathname)
  if ((SPA_ROUTES as readonly string[]).includes(path)) return true
  if (path.startsWith('/admin/applications/')) return true
  return false
}

export function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/'
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed || '/'
}

export function absoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const clean = path.startsWith('/') ? path : `/${path}`
  return `${SITE_ORIGIN}${clean}`
}
