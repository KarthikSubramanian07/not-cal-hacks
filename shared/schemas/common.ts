import { z } from 'zod'
import { LONG_ANSWER_MAX } from '../constants'

/**
 * Fields every applicant answers regardless of what they are applying as.
 *
 * Hacker and judge overlap by roughly half their fields, which is the
 * reason answers live in a single JSON column rather than one wide nullable
 * table or a table per type. See README "Why one JSON column".
 */

const trimmed = (max: number) => z.string().trim().max(max)

/** Optional free text: empty string and undefined both mean "not answered". */
export const optionalText = (max: number) =>
  z
    .union([z.literal(''), trimmed(max)])
    .optional()
    .transform((v) => (v === '' ? undefined : v))

const CURRENT_YEAR = 2026

export const urlField = (host: string) =>
  z
    .union([
      z.literal(''),
      z
        .string()
        .trim()
        .max(200)
        .refine(
          (v) => {
            try {
              const url = new URL(v.startsWith('http') ? v : `https://${v}`)
              return url.hostname === host || url.hostname.endsWith(`.${host}`)
            } catch {
              return false
            }
          },
          { message: `Must be a ${host} link` },
        ),
    ])
    .optional()
    .transform((v) => (v === '' ? undefined : v))

export const commonAnswersSchema = z.object({
  firstName: trimmed(60).min(1, 'Required'),
  lastName: trimmed(60).min(1, 'Required'),
  pronouns: optionalText(40),
  school: trimmed(120).min(1, 'Required'),
  gradYear: z
    .number()
    .int('Whole years only')
    .min(CURRENT_YEAR - 8, 'That is a long time ago')
    .max(CURRENT_YEAR + 8, 'That is a long time from now'),
  linkedin: urlField('linkedin.com'),
  github: urlField('github.com'),
  // The field is named after the joke the whole product is built on.
  whyNotCalHacks: trimmed(LONG_ANSWER_MAX).min(40, 'Give us at least a couple of sentences'),
})

export type CommonAnswers = z.infer<typeof commonAnswersSchema>
