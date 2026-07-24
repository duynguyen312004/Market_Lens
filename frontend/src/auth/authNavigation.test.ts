import { describe, expect, it } from 'vitest'

import {
  buildSessionExpiredLoginUrl,
  getSafeReturnPath,
} from './authNavigation'

describe('auth navigation', () => {
  it('chỉ nhận đường dẫn nội bộ an toàn', () => {
    expect(getSafeReturnPath('/history?page=2')).toBe('/history?page=2')
    expect(getSafeReturnPath('https://evil.example')).toBeNull()
    expect(getSafeReturnPath('//evil.example')).toBeNull()
    expect(getSafeReturnPath('/\\evil.example')).toBeNull()
    expect(getSafeReturnPath('/login?from=/dashboard')).toBeNull()
  })

  it('tạo URL login khi session hết hạn và giữ return path', () => {
    expect(
      buildSessionExpiredLoginUrl('/customers', '?tab=vip'),
    ).toBe('/login?sessionExpired=1&from=%2Fcustomers%3Ftab%3Dvip')
  })
})
