/**
 * Cookie sessions.
 *
 * The cookie carries a 256-bit random token. The database stores only an HMAC
 * of that token, so read access to the `sessions` table does not let anyone
 * mint a working cookie. Rotating `SESSION_SECRET` invalidates every session.
 */

export const SESSION_COOKIE = 'nch_session'
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

const toB64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

export function newSessionToken(): string {
  return toB64Url(crypto.getRandomValues(new Uint8Array(32)))
}

export async function hashToken(token: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token))
  return toB64Url(new Uint8Array(sig))
}

export function buildSessionCookie(token: string, opts: { secure: boolean }): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    // Lax rather than Strict: the applicant status link is shared and followed
    // from email and chat, and a top-level GET should not land on a signed-out
    // page. Lax still blocks the cross-site POST cases that matter.
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ]
  if (opts.secure) parts.push('Secure')
  return parts.join('; ')
}

export function clearSessionCookie(opts: { secure: boolean }): string {
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (opts.secure) parts.push('Secure')
  return parts.join('; ')
}

export function readSessionCookie(header: string | null | undefined): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [rawName, ...rest] = part.split('=')
    if (rawName?.trim() === SESSION_COOKIE) {
      const value = rest.join('=').trim()
      return value.length > 0 ? value : null
    }
  }
  return null
}
