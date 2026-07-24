import { describe, expect, it } from 'vitest'

import { parseApiError } from './apiErrors'

describe('parseApiError', () => {
  it('giữ error contract và request ID để đối chiếu server log', () => {
    const result = parseApiError({
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: 'DATABASE_UNAVAILABLE',
            message: 'Không thể truy cập dữ liệu phân tích lúc này.',
            details: null,
          },
        },
        headers: {
          'x-request-id': 'request-123',
        },
      },
    })

    expect(result).toEqual({
      code: 'DATABASE_UNAVAILABLE',
      message: 'Không thể truy cập dữ liệu phân tích lúc này.',
      details: null,
      requestId: 'request-123',
    })
  })

  it('không tạo request ID giả khi backend không phản hồi', () => {
    const result = parseApiError({
      isAxiosError: true,
      code: 'ERR_NETWORK',
    })

    expect(result.code).toBe('NETWORK_ERROR')
    expect(result.requestId).toBeNull()
  })
})
