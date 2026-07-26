import { describe, expect, it } from 'vitest'

import { getAuthErrorMessage } from './authErrors'

class AuthLikeError extends Error {
  code?: string
  status?: number

  constructor(message: string, code?: string, status?: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

describe('getAuthErrorMessage', () => {
  it('explains the project email quota without blaming repeated clicks', () => {
    const error = new AuthLikeError(
      'Email rate limit exceeded',
      'over_email_send_rate_limit',
      429,
    )

    expect(getAuthErrorMessage(error, 'en')).toContain(
      'email sending limit',
    )
    expect(getAuthErrorMessage(error, 'vi')).toContain(
      'giới hạn gửi email',
    )
  })

  it('identifies addresses blocked by the default Supabase sender', () => {
    const error = new AuthLikeError(
      'Email address not authorized',
      'email_address_not_authorized',
      400,
    )

    expect(getAuthErrorMessage(error, 'en')).toContain('not authorized')
    expect(getAuthErrorMessage(error, 'vi')).toContain('chưa được phép')
  })

  it('keeps request throttling separate from the email quota', () => {
    const error = new AuthLikeError(
      'Request rate limit reached',
      'over_request_rate_limit',
      429,
    )

    expect(getAuthErrorMessage(error, 'en')).toContain('requests')
    expect(getAuthErrorMessage(error, 'vi')).toContain('yêu cầu')
  })

  it('supports legacy 429 errors without a structured code', () => {
    const error = new AuthLikeError('Please try again later', undefined, 429)

    expect(getAuthErrorMessage(error, 'en')).toContain('requests')
  })
})
