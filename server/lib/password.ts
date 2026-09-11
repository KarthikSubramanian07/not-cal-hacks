/**
 * Password hashing on top of WebCrypto PBKDF2-SHA256.
 *
 * Workers have no native argon2/bcrypt and pulling in a WASM implementation
 * costs more startup latency than it buys here, so this uses the strongest
 * primitive the runtime ships natively.
 *
 * The iteration count is stored inside the hash string, so it can be raised
 * later and old hashes keep verifying (and can be transparently upgraded on
 * next successful login).
 */

const ITERATIONS = 100_000
const KEY_BITS = 256
const SALT_BYTES = 16
const PREFIX = 'pbkdf2-sha256'

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))

const fromB64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0))

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    KEY_BITS,
  )
  return new Uint8Array(bits)
}

/** Returns `pbkdf2-sha256$<iterations>$<salt>$<hash>`. */
export async function hashPassword(password: string, iterations = ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await derive(password, salt, iterations)
  return `${PREFIX}$${iterations}$${toB64(salt)}$${toB64(hash)}`
}

/**
 * Constant-time comparison. A plain `===` on the base64 strings would leak the
 * length of the matching prefix through timing, which is a real (if slow)
 * oracle for an attacker who can measure it.
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= (a[i] as number) ^ (b[i] as number)
  return diff === 0
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== PREFIX) return false
  const iterations = Number(parts[1])
  if (!Number.isInteger(iterations) || iterations < 1_000 || iterations > 5_000_000) return false
  try {
    const salt = fromB64(parts[2] as string)
    const expected = fromB64(parts[3] as string)
    const actual = await derive(password, salt, iterations)
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

/** True when a stored hash was made with weaker settings than we now use. */
export function needsRehash(stored: string): boolean {
  const parts = stored.split('$')
  return parts[0] !== PREFIX || Number(parts[1]) < ITERATIONS
}

export const PASSWORD_ITERATIONS = ITERATIONS
