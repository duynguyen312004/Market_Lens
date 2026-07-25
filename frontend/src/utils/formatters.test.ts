import { describe, expect, it } from 'vitest'

import {
  formatCompactVnd,
  formatDate,
  formatDateTime,
  formatMonth,
  formatPercent,
  formatShortDate,
} from './formatters'

describe('analytics formatters', () => {
  it('format date-only mà không làm lệch ngày', () => {
    expect(formatDate('2026-07-24')).toBe('24/07/2026')
    expect(formatShortDate('2026-07-24')).toBe('24/07')
  })

  it('handles API timestamps and invalid values without crashing', () => {
    expect(formatDate('2026-07-24T10:30:00Z', 'en')).toBe('07/24/2026')
    expect(formatDateTime('2026-07-24T10:30:00Z', 'en')).toContain(
      '07/24/2026',
    )
    expect(formatDate('not-a-date', 'vi')).toBe('not-a-date')
  })

  it('format nhãn tháng tiếng Việt', () => {
    expect(formatMonth('2026-07')).toBe('T7/2026')
  })

  it('uses English date and number conventions for English', () => {
    expect(formatDate('2026-07-24', 'en')).toBe('07/24/2026')
    expect(formatShortDate('2026-07-24', 'en')).toBe('07/24')
    expect(formatMonth('2026-07', 'en')).toBe('Jul 2026')
    expect(formatPercent(12.34, 1, true, 'en')).toBe('+12.3')
  })

  it('giữ dấu tăng trưởng rõ ràng', () => {
    expect(formatPercent(12.34, 1, true)).toBe('+12,3')
    expect(formatPercent(-8.2, 1, true)).toBe('-8,2')
    expect(formatPercent(0)).toBe('0')
  })

  it('rút gọn doanh thu cho trục biểu đồ', () => {
    expect(formatCompactVnd(1_200_000)).toMatch(/1,2/)
  })
})
