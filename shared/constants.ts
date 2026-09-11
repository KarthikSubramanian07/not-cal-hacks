/**
 * Single source of truth for the enumerated vocabulary of the product.
 *
 * Both the database CHECK constraints and the Zod schemas are generated from
 * these lists, so adding a track or a status is a one-line change that
 * propagates to the form, the filters, the API and the migration.
 */

export const APPLICATION_TYPES = ['hacker', 'judge'] as const
export type ApplicationType = (typeof APPLICATION_TYPES)[number]

export const APPLICATION_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'accepted',
  'waitlisted',
  'rejected',
] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const USER_ROLES = ['applicant', 'organizer'] as const
export type UserRole = (typeof USER_ROLES)[number]

/** Statuses an organizer is allowed to set by hand from the dashboard. */
export const DECISION_STATUSES = ['accepted', 'waitlisted', 'rejected'] as const
export type DecisionStatus = (typeof DECISION_STATUSES)[number]

/** Statuses that put an application into the review pool. */
export const REVIEWABLE_STATUSES = ['submitted', 'under_review'] as const

export const EXPERIENCE_LEVELS = ['first', '1-2', '3+'] as const
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]

export const TRACKS = ['AI', 'Health', 'Fintech', 'Climate', 'Hardware', 'Open'] as const
export type Track = (typeof TRACKS)[number]

export const EXPERTISE = ['Web', 'Mobile', 'ML', 'Hardware', 'Design', 'Cloud'] as const
export type Expertise = (typeof EXPERTISE)[number]

export const AVAILABILITY = ['Fri PM', 'Sat AM', 'Sat PM', 'Sun AM'] as const
export type Availability = (typeof AVAILABILITY)[number]

export const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const
export type TshirtSize = (typeof TSHIRT_SIZES)[number]

export const RUBRIC_CRITERIA = ['technical', 'passion', 'fit'] as const
export type RubricCriterion = (typeof RUBRIC_CRITERIA)[number]

export const SCORE_MIN = 1
export const SCORE_MAX = 5
export const MAX_TOTAL_SCORE = RUBRIC_CRITERIA.length * SCORE_MAX

export const LONG_ANSWER_MAX = 500

/** Human-facing copy for the rubric. Shown next to every slider. */
export const RUBRIC_LABELS: Record<RubricCriterion, { label: string; help: string }> = {
  technical: {
    label: 'Technical',
    help: 'Can they build the thing they are describing?',
  },
  passion: {
    label: 'Passion',
    help: 'Do they care about this beyond a resume line?',
  },
  fit: {
    label: 'Fit',
    help: 'Will a weekend here actually move them forward?',
  },
}

/** What each score on the rubric means, so two reviewers mean the same thing. */
export const SCORE_ANCHORS: Record<number, string> = {
  1: 'No signal',
  2: 'Thin',
  3: 'Solid',
  4: 'Strong',
  5: 'Exceptional',
}

export const APPLICATION_TYPE_META: Record<
  ApplicationType,
  { label: string; tagline: string; blurb: string }
> = {
  hacker: {
    label: 'Hacker',
    tagline: 'You are here to build something',
    blurb:
      'Thirty-six hours, a table, and whatever you can carry. Tell us what you want to make and we will get out of the way.',
  },
  judge: {
    label: 'Judge',
    tagline: 'You are here to score the work',
    blurb:
      'You have sat on this side of the table. Tell us what you can evaluate, when you can be in the room, and we will hand you a stack.',
  },
}

export const STATUS_META: Record<
  ApplicationStatus,
  { label: string; tone: string; applicantCopy: string }
> = {
  draft: {
    label: 'Draft',
    tone: 'slate',
    applicantCopy: 'Saved, not sent. Nobody can see this but you.',
  },
  submitted: {
    label: 'Submitted',
    tone: 'sky',
    applicantCopy: 'In the pile. Every application gets read by a human.',
  },
  under_review: {
    label: 'Under review',
    tone: 'amber',
    applicantCopy: 'Someone is reading it right now. Genuinely, right now.',
  },
  accepted: {
    label: 'Accepted',
    tone: 'moss',
    applicantCopy: 'You are in. Come build something you will want to show people.',
  },
  waitlisted: {
    label: 'Waitlisted',
    tone: 'iris',
    applicantCopy: 'A real maybe. Spots open up constantly as plans change.',
  },
  rejected: {
    label: 'Not this time',
    tone: 'rust',
    applicantCopy: 'Not this round. This says nothing about what you can build.',
  },
}
