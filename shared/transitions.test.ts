import { describe, expect, it } from 'vitest'
import { APPLICATION_STATUSES } from './constants'
import { ALLOWED_TRANSITIONS, canTransition, isDecided } from './transitions'

describe('status machine', () => {
  it('only lets a draft become submitted', () => {
    expect(canTransition('draft', 'submitted')).toBe(true)
    expect(canTransition('draft', 'accepted')).toBe(false)
    expect(canTransition('draft', 'under_review')).toBe(false)
  })

  it('never allows a return to draft, because submitting is final', () => {
    for (const from of APPLICATION_STATUSES) {
      expect(canTransition(from, 'draft')).toBe(false)
    }
  })

  it('lets a waitlisted application be promoted', () => {
    expect(canTransition('waitlisted', 'accepted')).toBe(true)
  })

  it('lets a decision be reversed, because organizers change their minds', () => {
    expect(canTransition('accepted', 'rejected')).toBe(true)
    expect(canTransition('rejected', 'accepted')).toBe(true)
  })

  it('has an entry for every status', () => {
    for (const status of APPLICATION_STATUSES) {
      expect(ALLOWED_TRANSITIONS[status]).toBeDefined()
    }
  })

  it('never lists a status as a transition to itself', () => {
    for (const status of APPLICATION_STATUSES) {
      expect(ALLOWED_TRANSITIONS[status]).not.toContain(status)
    }
  })

  it('knows which statuses are decisions', () => {
    expect(isDecided('accepted')).toBe(true)
    expect(isDecided('submitted')).toBe(false)
  })
})
