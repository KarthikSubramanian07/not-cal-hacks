import { z } from 'zod'
import { APPLICATION_TYPES, type ApplicationType } from '../constants'
import { hackerAnswersSchema } from './hacker'
import { mentorAnswersSchema } from './mentor'

export * from './common'
export * from './hacker'
export * from './mentor'
export * from './auth'
export * from './review'

/** The strict schema a set of answers must satisfy to be *submitted*. */
export const ANSWERS_SCHEMAS = {
  hacker: hackerAnswersSchema,
  mentor: mentorAnswersSchema,
} as const satisfies Record<ApplicationType, z.ZodObject>

export const answersSchemaFor = (type: ApplicationType) => ANSWERS_SCHEMAS[type]

/** Every field name a given application type is allowed to store. */
export const ANSWER_KEYS = Object.fromEntries(
  APPLICATION_TYPES.map((t) => [t, Object.keys(ANSWERS_SCHEMAS[t].shape)]),
) as unknown as Record<ApplicationType, readonly string[]>

/**
 * Drafts are deliberately validated far more loosely than submissions.
 *
 * Autosave fires while someone is mid-sentence, so a draft must be able to hold
 * a half-typed essay or an empty required field. What it must *not* hold is
 * unbounded or unexpected data, so values are still type-checked and capped and
 * unknown keys are dropped.
 */
const draftValue = z.union([
  z.string().max(2_000),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(80)).max(12),
  z.null(),
])

const draftSchemaFor = (type: ApplicationType) =>
  z.object(Object.fromEntries(ANSWER_KEYS[type].map((k) => [k, draftValue.optional()])))

export const DRAFT_SCHEMAS = Object.fromEntries(
  APPLICATION_TYPES.map((t) => [t, draftSchemaFor(t)]),
) as Record<ApplicationType, ReturnType<typeof draftSchemaFor>>

export const draftAnswersSchemaFor = (type: ApplicationType) => DRAFT_SCHEMAS[type]

export type AnswersFor<T extends ApplicationType> = z.infer<(typeof ANSWERS_SCHEMAS)[T]>
export type AnyAnswers = z.infer<(typeof ANSWERS_SCHEMAS)[ApplicationType]>
export type DraftAnswers = Record<string, string | number | boolean | string[] | null | undefined>

/**
 * Flattens a Zod error into `{ fieldName: message }`, which is the shape every
 * form in the app renders. Only the first error per field is kept: showing a
 * person four complaints about one input is hostile.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    if (!(key in out)) out[key] = issue.message
  }
  return out
}
