import axios from 'axios'

export type ApiErrorDetails = {
  errors?: Array<{
    row?: number
    column: string
    reason: string
    identifier?: string
  }>
  total_error_count?: number
  [key: string]: unknown
}

export type ParsedApiError = {
  code: string
  message: string
  details: ApiErrorDetails | null
  requestId: string | null
}

export function parseApiError(error: unknown): ParsedApiError {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data?.error
    const responseRequestId = error.response?.headers?.['x-request-id']
    const requestId =
      typeof responseRequestId === 'string' ? responseRequestId : null
    if (apiError?.code && apiError?.message) {
      return {
        code: apiError.code,
        message: apiError.message,
        details: apiError.details ?? null,
        requestId,
      }
    }

    if (error.code === 'ECONNABORTED') {
      return {
        code: 'REQUEST_TIMEOUT',
        message: 'Quá thời gian xử lý. Hãy thử lại với file nhỏ hơn.',
        details: null,
        requestId,
      }
    }

    if (!error.response) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Không thể kết nối backend. Kiểm tra server rồi thử lại.',
        details: null,
        requestId: null,
      }
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'Đã có lỗi không mong đợi. Vui lòng thử lại.',
    details: null,
    requestId: null,
  }
}
