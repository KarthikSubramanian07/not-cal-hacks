import { describe, expect, it } from 'vitest'
import {
  answersSchemaFor,
  draftAnswersSchemaFor,
  fieldErrors,
  hackerAnswersSchema,
  mentorAnswersSchema,
  signupSchema,
} from './index'

const completeHacker = {
  firstName: 'Amara',
  lastName: 'Okonkwo',
  school: 'UC Berkeley',
  gradYear: 2028,
  major: 'EECS',
  experienceLevel: 'first',
  tracks: ['AI'],
  tshirtSize: 'M',
  whyNotCalHacks: 'a'.repeat(60),
  proudestProject: 'b'.repeat(60),
}

describe('hacker answers', () => {
  it('accepts a complete application', () => {
    expect(hackerAnswersSchema.safeParse(completeHacker).success).toBe(true)
  })

  it('rejects an essay that is too short to say anything', () => {
    const result = hackerAnswersSchema.safeParse({ ...completeHacker, whyNotCalHacks: 'no' })
    expect(result.success).toBe(false)
  })

  it('caps tracks at three, because picking everything says nothing', () => {
    const result = hackerAnswersSchema.safeParse({
      ...completeHacker,
      tracks: ['AI', 'Health', 'Fintech', 'Climate'],
    })
    expect(result.success).toBe(false)
  })

  it('requires at least one track', () => {
    expect(hackerAnswersSchema.safeParse({ ...completeHacker, tracks: [] }).success).toBe(false)
  })

  it('rejects a graduation year from another century', () => {
    expect(hackerAnswersSchema.safeParse({ ...completeHacker, gradYear: 1998 }).success).toBe(false)
  })

  it('treats an empty optional field as unanswered rather than invalid', () => {
    const result = hackerAnswersSchema.safeParse({ ...completeHacker, pronouns: '', github: '' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pronouns).toBeUndefined()
      expect(result.data.github).toBeUndefined()
    }
  })

  it('rejects a profile link pointing at the wrong host', () => {
    const result = hackerAnswersSchema.safeParse({
      ...completeHacker,
      github: 'https://gitlab.com/someone',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a profile link without a scheme', () => {
    const result = hackerAnswersSchema.safeParse({ ...completeHacker, github: 'github.com/me' })
    expect(result.success).toBe(true)
  })
})

describe('mentor answers', () => {
  const completeMentor = {
    firstName: 'June',
    lastName: 'Whitaker',
    school: 'Georgia Tech',
    gradYear: 2020,
    company: 'Cloudflare',
    role: 'Staff Engineer',
    expertise: ['Cloud'],
    yearsExperience: 9,
    availability: ['Sat AM'],
    mentoredBefore: true,
    whyNotCalHacks: 'c'.repeat(60),
  }

  it('accepts a complete application', () => {
    expect(mentorAnswersSchema.safeParse(completeMentor).success).toBe(true)
  })

  it('requires at least one availability shift', () => {
    const result = mentorAnswersSchema.safeParse({ ...completeMentor, availability: [] })
    expect(result.success).toBe(false)
  })

  it('does not accept hacker-only fields as a substitute', () => {
    const { company: _company, ...withoutCompany } = completeMentor
    const result = mentorAnswersSchema.safeParse({ ...withoutCompany, major: 'EECS' })
    expect(result.success).toBe(false)
  })
})

describe('draft schemas', () => {
  it('accepts a half-typed application', () => {
    const result = draftAnswersSchemaFor('hacker').safeParse({
      firstName: 'A',
      whyNotCalHacks: 'x',
    })
    expect(result.success).toBe(true)
  })

  it('accepts an empty draft', () => {
    expect(draftAnswersSchemaFor('hacker').safeParse({}).success).toBe(true)
  })

  it('drops keys that do not belong to the type', () => {
    const result = draftAnswersSchemaFor('hacker').safeParse({ firstName: 'A', nonsense: 'x' })
    expect(result.success).toBe(true)
    if (result.success) expect('nonsense' in result.data).toBe(false)
  })

  it('refuses an unbounded value, so the column cannot become a dumping ground', () => {
    const result = draftAnswersSchemaFor('hacker').safeParse({ whyNotCalHacks: 'x'.repeat(5000) })
    expect(result.success).toBe(false)
  })

  it('is looser than the submission schema for the same input', () => {
    const partial = { firstName: 'A' }
    expect(draftAnswersSchemaFor('hacker').safeParse(partial).success).toBe(true)
    expect(answersSchemaFor('hacker').safeParse(partial).success).toBe(false)
  })
})

describe('fieldErrors', () => {
  it('keeps only the first message per field', () => {
    const result = hackerAnswersSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = fieldErrors(result.error)
      expect(errors.firstName).toBeTruthy()
      expect(Object.values(errors).every((v) => typeof v === 'string')).toBe(true)
    }
  })
})

describe('signup', () => {
  it('lowercases and trims the email so casing cannot create a second account', () => {
    const result = signupSchema.safeParse({
      email: '  Test.User@Example.COM ',
      password: 'hunter2hunter2',
      fullName: 'Test User',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('test.user@example.com')
  })

  it('rejects a password under eight characters', () => {
    const result = signupSchema.safeParse({
      email: 'a@b.co',
      password: 'short',
      fullName: 'A',
    })
    expect(result.success).toBe(false)
  })
})
