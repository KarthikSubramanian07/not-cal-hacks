import type { ApiErrorBody } from '@shared/api'

/**
 * Thin typed wrapper over fetch.
 *
 * Every failure arrives here as one shape, so callers never branch on status
 * codes and forms can map `fields` straight onto their inputs.
 */
export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorBody['error']['code'] | 'network',
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      // Session lives in an HttpOnly cookie, so every call must carry it.
      credentials: 'same-origin',
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiClientError(0, 'network', 'Could not reach the server. Check your connection.')
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let payload: unknown = null
  if (text.length > 0) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const body = payload as ApiErrorBody | null
    throw new ApiClientError(
      response.status,
      body?.error?.code ?? 'server_error',
      body?.error?.message ?? 'Something went wrong.',
      body?.error?.fields,
    )
  }

  return payload as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
