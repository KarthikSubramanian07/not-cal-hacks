import { z } from 'zod'
import { EXPERIENCE_LEVELS, LONG_ANSWER_MAX, TRACKS, TSHIRT_SIZES } from '../constants'
import { commonAnswersSchema, optionalText } from './common'

export const hackerAnswersSchema = commonAnswersSchema.extend({
  major: z.string().trim().min(1, 'Required').max(80),
  experienceLevel: z.enum(EXPERIENCE_LEVELS, { message: 'Pick one' }),
  tracks: z
    .array(z.enum(TRACKS))
    .min(1, 'Pick at least one')
    .max(3, 'Three at most, focus is a feature'),
  proudestProject: z
    .string()
    .trim()
    .min(40, 'Give us at least a couple of sentences')
    .max(LONG_ANSWER_MAX),
  dietary: optionalText(140),
  tshirtSize: z.enum(TSHIRT_SIZES, { message: 'Pick one' }),
})

export type HackerAnswers = z.infer<typeof hackerAnswersSchema>
