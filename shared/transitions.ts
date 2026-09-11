import type { ApplicationStatus } from './constants'

/**
 * The status machine, written once and enforced on the server.
 *
 * Keeping this as data rather than scattered `if` statements means the
 * transitions are testable in isolation, and that the applicant timeline can
 * render a path that the backend guarantees is actually reachable.
 */
export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  draft: ['submitted'],
  // First review moves an application into `under_review` automatically.
  submitted: ['under_review', 'accepted', 'waitlisted', 'rejected'],
  under_review: ['accepted', 'waitlisted', 'rejected'],
  // Decisions are reversible: organizers change their minds, and a waitlist
  // that cannot be promoted to accepted is not a waitlist.
  accepted: ['waitlisted', 'rejected'],
  waitlisted: ['accepted', 'rejected'],
  rejected: ['accepted', 'waitlisted'],
}

export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

/** Statuses that mean a human has made a final call. */
export const DECIDED_STATUSES: readonly ApplicationStatus[] = ['accepted', 'waitlisted', 'rejected']

export const isDecided = (status: ApplicationStatus) => DECIDED_STATUSES.includes(status)
