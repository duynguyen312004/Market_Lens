import { describe, expect, it } from 'vitest'

import { resolveApiBaseUrl } from './apiConfig'

describe('resolveApiBaseUrl', () => {
  it('ưu tiên base URL đầy đủ và bỏ dấu gạch cuối', () => {
    expect(
      resolveApiBaseUrl({
        VITE_API_BASE_URL: 'https://api.marketlens.vn/api/v1/',
        VITE_API_ORIGIN: 'https://ignored.example',
      }),
    ).toBe('https://api.marketlens.vn/api/v1')
  })

  it('tạo API prefix từ production origin', () => {
    expect(
      resolveApiBaseUrl({
        VITE_API_ORIGIN: 'https://marketlens-api.onrender.com/',
      }),
    ).toBe('https://marketlens-api.onrender.com/api/v1')
  })

  it('dùng backend local khi chưa cấu hình', () => {
    expect(resolveApiBaseUrl({})).toBe(
      'http://localhost:8000/api/v1',
    )
  })
})
