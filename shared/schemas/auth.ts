import { z } from 'zod'

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: 'That does not look like an email' })

/**
 * Eight characters is the floor, not the goal. Length is the only property that
 * reliably helps, so there are no character-class rules that push people toward
 * `Password1!` and a sticky note.
 */
export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .max(200, 'At most 200 characters')

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(1, 'Required').max(120),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Required').max(200),
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
