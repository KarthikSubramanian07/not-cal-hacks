import { z } from 'zod'
import { AVAILABILITY, EXPERTISE } from '../constants'
import { commonAnswersSchema } from './common'

export const judgeAnswersSchema = commonAnswersSchema.extend({
  company: z.string().trim().min(1, 'Required').max(120),
  role: z.string().trim().min(1, 'Required').max(120),
  expertise: z.array(z.enum(EXPERTISE)).min(1, 'Pick at least one').max(4, 'Four at most'),
  yearsExperience: z
    .number()
    .int('Whole years only')
    .min(0, 'Cannot be negative')
    .max(60, 'Respectfully, no'),
  availability: z.array(z.enum(AVAILABILITY)).min(1, 'Pick at least one shift'),
  judgedBefore: z.boolean(),
})

export type JudgeAnswers = z.infer<typeof judgeAnswersSchema>
