import { describe, expect, it } from 'vitest'

import {
  formatCompactVnd,
  formatDate,
  formatMonth,
  formatPercent,
  formatShortDate,
} from './formatters'

describe('analytics formatters', () => {
  it('format date-only mà không làm lệch ngày', () => {
    expect(formatDate('2026-07-24')).toBe('24/07/2026')
    expect(formatShortDate('2026-07-24')).toBe('24/07')
  })

  it('format nhãn tháng tiếng Việt', () => {
    expect(formatMonth('2026-07')).toBe('T7/2026')
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
