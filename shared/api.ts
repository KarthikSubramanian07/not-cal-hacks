import type {
  ApplicationStatus,
  ApplicationType,
  RubricCriterion,
  UserRole,
} from './constants'
import type { DraftAnswers } from './schemas'

/** Every non-2xx response from the API has exactly this body. */
export interface ApiErrorBody {
  error: {
    code:
      | 'bad_request'
      | 'unauthorized'
      | 'forbidden'
      | 'not_found'
      | 'conflict'
      | 'rate_limited'
      | 'server_error'
    message: string
    /** Present on validation failures: field name to first message. */
    fields?: Record<string, string>
  }
}

export interface SessionUser {
  id: string
  email: string
  fullName: string
  role: UserRole
}

export interface StatusEvent {
  id: number
  fromStatus: ApplicationStatus | null
  toStatus: ApplicationStatus
  createdAt: number
}

export interface ApplicationSummary {
  id: string
  type: ApplicationType
  status: ApplicationStatus
  answers: DraftAnswers
  submittedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface ApplicationWithTimeline extends ApplicationSummary {
  events: StatusEvent[]
}

export interface ReviewRow {
  id: string
  reviewerId: string
  reviewerName: string
  technical: number
  passion: number
  fit: number
  total: number
  comment: string | null
  createdAt: number
}

export interface AdminApplicationRow {
  id: string
  type: ApplicationType
  status: ApplicationStatus
  applicantName: string
  applicantEmail: string
  school: string
  reviewCount: number
  avgScore: number | null
  submittedAt: number | null
  updatedAt: number
}

export interface AdminApplicationDetail {
  id: string
  type: ApplicationType
  status: ApplicationStatus
  /** Stable pseudonym such as `A3F9`, shown whenever blind mode is on. */
  alias: string
  /** True when identifying fields were stripped *on the server*. */
  blinded: boolean
  applicantName: string | null
  applicantEmail: string | null
  answers: DraftAnswers
  submittedAt: number | null
  createdAt: number
  updatedAt: number
  reviews: ReviewRow[]
  /** The current organizer's own review, if they have already scored this one. */
  myReview: ReviewRow | null
}

export interface AdminStats {
  totalSubmitted: number
  awaitingReview: number
  reviewed: number
  decided: number
  byStatus: Record<ApplicationStatus, number>
}

export interface Calibration {
  /** Mean total score this organizer has given. */
  myAverage: number | null
  /** Mean total score across every organizer. */
  teamAverage: number | null
  myCount: number
  teamCount: number
}

export interface QueueResponse {
  application: AdminApplicationDetail | null
  /** How many reviewable applications this organizer has not yet scored. */
  remaining: number
  calibration: Calibration
}

export type ScoreMap = Record<RubricCriterion, number>
