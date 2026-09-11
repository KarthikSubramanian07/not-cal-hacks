import { describe, expect, it } from 'vitest'
import { parsePortalIntent, pathForIntent, sanitizeOAuthNext, signupPathForIntent } from './portal'

describe('parsePortalIntent', () => {
  it('accepts the three doors and nothing else', () => {
    expect(parsePortalIntent('hacker')).toBe('hacker')
    expect(parsePortalIntent('judge')).toBe('judge')
    expect(parsePortalIntent('organizer')).toBe('organizer')
    expect(parsePortalIntent('mentor')).toBeNull()
    expect(parsePortalIntent('admin')).toBeNull()
    expect(parsePortalIntent(null)).toBeNull()
  })
})

describe('pathForIntent', () => {
  it('sends applicants to their form and organizers to the console', () => {
    expect(pathForIntent('hacker', 'applicant')).toBe('/apply/hacker')
    expect(pathForIntent('judge', 'applicant')).toBe('/apply/judge')
    expect(pathForIntent('organizer', 'organizer')).toBe('/admin')
  })

  it('does not let an applicant through the organizer door', () => {
    expect(pathForIntent('organizer', 'applicant')).toBe('/apply')
  })
})

describe('signupPathForIntent', () => {
  it('refuses a self-serve organizer signup', () => {
    expect(signupPathForIntent('organizer')).toBe('/login?as=organizer')
  })
})

describe('sanitizeOAuthNext', () => {
  it('allows only in-app destinations', () => {
    expect(sanitizeOAuthNext('/apply/judge')).toBe('/apply/judge')
    expect(sanitizeOAuthNext('/admin')).toBe('/admin')
    expect(sanitizeOAuthNext('https://evil.example/phish')).toBe('/apply')
    expect(sanitizeOAuthNext('//evil.example')).toBe('/apply')
    expect(sanitizeOAuthNext('/apply/hacker?x=1')).toBe('/apply/hacker')
    expect(sanitizeOAuthNext('/login')).toBe('/apply')
  })
})
