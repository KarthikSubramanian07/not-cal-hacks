import type { ApplicationType } from '../../shared/constants'
import type { DraftAnswers } from '../../shared/schemas'

/**
 * Blind review.
 *
 * Redaction happens on the *server*. A client-side "hide the name" toggle is
 * theatre: the name is still in the payload, still in the devtools network tab,
 * and still one careless component away from rendering. If the organizer has
 * not asked to see identities, identities never leave the database.
 */

/** Fields removed from `answers` when blind mode is on. */
export const BLIND_FIELDS = ['firstName', 'lastName', 'linkedin', 'github'] as const

/**
 * Stable four-character pseudonym derived from the application id.
 *
 * FNV-1a, not a cryptographic hash: the goal is a memorable handle an organizer
 * can say out loud ("A3F9 is a yes"), not secrecy. The id it is derived from is
 * already only visible to organizers.
 */
export function aliasFor(applicationId: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < applicationId.length; i++) {
    hash ^= applicationId.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return (hash & 0xffff).toString(16).toUpperCase().padStart(4, '0')
}

export function redactAnswers(answers: DraftAnswers, _type: ApplicationType): DraftAnswers {
  const out: DraftAnswers = { ...answers }
  for (const field of BLIND_FIELDS) delete out[field]
  return out
}

export function displayName(answers: DraftAnswers, fallback: string): string {
  const first = typeof answers.firstName === 'string' ? answers.firstName.trim() : ''
  const last = typeof answers.lastName === 'string' ? answers.lastName.trim() : ''
  const joined = `${first} ${last}`.trim()
  return joined.length > 0 ? joined : fallback
}
