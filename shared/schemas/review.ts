import { z } from 'zod'
import {
  APPLICATION_STATUSES,
  APPLICATION_TYPES,
  DECISION_STATUSES,
  SCORE_MAX,
  SCORE_MIN,
} from '../constants'

const score = z
  .number()
  .int('Whole numbers only')
  .min(SCORE_MIN, `Lowest is ${SCORE_MIN}`)
  .max(SCORE_MAX, `Highest is ${SCORE_MAX}`)

export const reviewInputSchema = z.object({
  applicationId: z.string().min(1),
  technical: score,
  passion: score,
  fit: score,
  comment: z
    .union([z.literal(''), z.string().trim().max(1_000)])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
})

export type ReviewInput = z.infer<typeof reviewInputSchema>

export const decisionSchema = z.object({
  status: z.enum(DECISION_STATUSES),
})

export const applicationFiltersSchema = z.object({
  type: z.enum(APPLICATION_TYPES).optional(),
  status: z.enum(APPLICATION_STATUSES).optional(),
  q: z.string().trim().max(120).optional(),
  sort: z
    .enum(['submitted_desc', 'submitted_asc', 'score_desc', 'score_asc', 'reviews_asc'])
    .default('submitted_desc'),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
})

export type ApplicationFilters = z.infer<typeof applicationFiltersSchema>
