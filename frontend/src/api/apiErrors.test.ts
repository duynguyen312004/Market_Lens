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
    }, 'vi')

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

  it('localizes the bounded analysis-period contract', () => {
    const result = parseApiError(
      {
        isAxiosError: true,
        response: {
          data: {
            error: {
              code: 'DATE_RANGE_TOO_LARGE',
              message: 'The analysis period exceeds the 1,826-day limit.',
              details: {
                actual_period_days: 2000,
                max_period_days: 1826,
              },
            },
          },
          headers: {},
        },
      },
      'vi',
    )

    expect(result.code).toBe('DATE_RANGE_TOO_LARGE')
    expect(result.message).toBe(
      'Khoảng thời gian dữ liệu quá dài. Hãy dùng file bao phủ tối đa năm năm.',
    )
  })
})
