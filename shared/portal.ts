import { APPLICATION_TYPES, type ApplicationType, type UserRole } from './constants'

/**
 * The three doors on `/apply`.
 *
 * Hacker and judge are applicant types with their own forms. Organizer is the
 * console, not an application: there is no self-serve path into that role.
 */
export const PORTAL_INTENTS = ['hacker', 'judge', 'organizer'] as const
export type PortalIntent = (typeof PORTAL_INTENTS)[number]

export const PORTAL_INTENT_META: Record<
  PortalIntent,
  {
    label: string
    tagline: string
    blurb: string
    badgeRole: string
    loggedOutCta: string
    loggedInCta: string
  }
> = {
  hacker: {
    label: 'Hacker',
    tagline: 'You are here to build something',
    blurb:
      'Thirty-six hours, a table, and whatever you can carry. Tell us what you want to make and we will get out of the way.',
    badgeRole: 'Hacker',
    loggedOutCta: 'Sign in as a hacker',
    loggedInCta: 'Apply as a hacker',
  },
  judge: {
    label: 'Judge',
    tagline: 'You are here to score the work',
    blurb:
      'You have sat on this side of the table. Tell us what you can evaluate, when you can be in the room, and we will hand you a stack.',
    badgeRole: 'Judge',
    loggedOutCta: 'Sign in as a judge',
    loggedInCta: 'Apply as a judge',
  },
  organizer: {
    label: 'Organizer',
    tagline: 'You are here to run the event',
    blurb:
      'The review console, the queue, the decisions. Organizer accounts are granted, not requested. Sign in with the one you already have.',
    badgeRole: 'Organizer',
    loggedOutCta: 'Organizer sign-in',
    loggedInCta: 'Open the console',
  },
}

export function isPortalIntent(value: string | null | undefined): value is PortalIntent {
  return (PORTAL_INTENTS as readonly string[]).includes(value ?? '')
}

export function parsePortalIntent(value: unknown): PortalIntent | null {
  return typeof value === 'string' && isPortalIntent(value) ? value : null
}

export function isApplicationType(value: string | null | undefined): value is ApplicationType {
  return (APPLICATION_TYPES as readonly string[]).includes(value ?? '')
}

/** Paths Google (or a bookmark) is allowed to send someone after sign-in. */
export const OAUTH_NEXT_ALLOWLIST = [
  '/apply',
  '/apply/hacker',
  '/apply/judge',
  '/admin',
  '/status',
] as const

export function sanitizeOAuthNext(raw: string | null | undefined): string {
  if (!raw) return '/apply'
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/apply'
  const path = raw.split('?')[0]?.split('#')[0] ?? '/apply'
  return (OAUTH_NEXT_ALLOWLIST as readonly string[]).includes(path) ? path : '/apply'
}

/** Where a successful sign-in for this intent should land. */
export function pathForIntent(intent: PortalIntent, role: UserRole): string {
  if (intent === 'organizer') return role === 'organizer' ? '/admin' : '/apply'
  return `/apply/${intent}`
}

export function signupPathForIntent(intent: PortalIntent): string {
  if (intent === 'organizer') return '/login?as=organizer'
  return `/signup?as=${intent}`
}

export function loginPathForIntent(intent: PortalIntent): string {
  return `/login?as=${intent}`
}
