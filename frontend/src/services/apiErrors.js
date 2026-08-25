const STATUS_MESSAGES = {
  400: 'The request was invalid.',
  401: 'Authentication is required.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
}

export class ApiError extends Error {
  constructor({ message, status = null, code = 'UNKNOWN' }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function notImplementedError(functionName) {
  return new ApiError({
    message: `${functionName} is not wired to FastAPI yet. Run with VITE_USE_API=false to use provisional demo data.`,
    status: null,
    code: 'NOT_IMPLEMENTED',
  })
}

export function normalizeApiError(error) {
  if (error instanceof ApiError) return error

  if (error?.code === 'ECONNABORTED') {
    return new ApiError({ message: 'The request timed out.', status: null, code: 'TIMEOUT' })
  }

  if (error?.isAxiosError && !error.response) {
    return new ApiError({
      message: 'Cannot reach the server. Check that the backend is running and VITE_API_BASE_URL is correct.',
      status: null,
      code: 'NETWORK_ERROR',
    })
  }

  if (error?.isAxiosError && error.response) {
    const { status } = error.response
    const detail = error.response.data
    const serverMessage = typeof detail === 'string' ? detail : typeof detail?.detail === 'string' ? detail.detail : null
    return new ApiError({
      message:
        serverMessage ??
        STATUS_MESSAGES[status] ??
        (status >= 500 ? 'The server encountered an internal error.' : 'The request failed.'),
      status,
      code: `HTTP_${status}`,
    })
  }

  if (error instanceof Error) {
    return new ApiError({ message: error.message, status: null, code: 'UNKNOWN' })
  }

  return new ApiError({ message: 'An unexpected error occurred.', status: null, code: 'UNKNOWN' })
}
