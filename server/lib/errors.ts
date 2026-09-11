import type { ApiErrorBody } from '../../shared/api'

type Code = ApiErrorBody['error']['code']

/**
 * The only error type handlers are allowed to throw.
 *
 * Everything else that escapes a handler becomes a generic 500 with no detail,
 * so an unexpected exception can never leak a query, a path or a row into a
 * response body.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: Code,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  toBody(): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.fields ? { fields: this.fields } : {}),
      },
    }
  }

  static badRequest(message: string, fields?: Record<string, string>) {
    return new ApiError(400, 'bad_request', message, fields)
  }
  static unauthorized(message = 'Sign in to continue.') {
    return new ApiError(401, 'unauthorized', message)
  }
  static forbidden(message = 'You do not have access to that.') {
    return new ApiError(403, 'forbidden', message)
  }
  static notFound(message = 'Not found.') {
    return new ApiError(404, 'not_found', message)
  }
  static conflict(message: string) {
    return new ApiError(409, 'conflict', message)
  }
}
