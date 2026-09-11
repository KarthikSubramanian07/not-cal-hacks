import { describe, expect, it } from 'vitest'
import { aliasFor, BLIND_FIELDS, displayName, redactAnswers } from './blind'

describe('aliasFor', () => {
  it('is stable for the same id', () => {
    expect(aliasFor('abc-123')).toBe(aliasFor('abc-123'))
  })

  it('differs between ids', () => {
    expect(aliasFor('abc-123')).not.toBe(aliasFor('abc-124'))
  })

  it('is always four uppercase hex characters, so it fits the UI', () => {
    for (const id of ['a', 'abc-123', crypto.randomUUID(), '']) {
      expect(aliasFor(id)).toMatch(/^[0-9A-F]{4}$/)
    }
  })
})

describe('redactAnswers', () => {
  const answers = {
    firstName: 'Amara',
    lastName: 'Okonkwo',
    linkedin: 'https://linkedin.com/in/amara',
    github: 'https://github.com/amara',
    school: 'UC Berkeley',
    whyNotCalHacks: 'Because I want to build something.',
  }

  it('removes every identifying field', () => {
    const redacted = redactAnswers(answers, 'hacker')
    for (const field of BLIND_FIELDS) {
      expect(redacted[field]).toBeUndefined()
    }
  })

  it('keeps the content a reviewer is meant to judge', () => {
    const redacted = redactAnswers(answers, 'hacker')
    expect(redacted.school).toBe('UC Berkeley')
    expect(redacted.whyNotCalHacks).toBe('Because I want to build something.')
  })

  it('does not mutate the original answers', () => {
    redactAnswers(answers, 'hacker')
    expect(answers.firstName).toBe('Amara')
  })
})

describe('displayName', () => {
  it('prefers the name on the application', () => {
    expect(displayName({ firstName: 'A', lastName: 'B' }, 'Account Name')).toBe('A B')
  })

  it('falls back to the account name when the form is empty', () => {
    expect(displayName({}, 'Account Name')).toBe('Account Name')
  })

  it('falls back when the form has only whitespace', () => {
    expect(displayName({ firstName: '  ', lastName: ' ' }, 'Account Name')).toBe('Account Name')
  })
})
