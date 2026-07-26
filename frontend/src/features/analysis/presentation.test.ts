import { describe, expect, it } from 'vitest'

import {
  getDatePeriod,
  getTrailingPeriodComparison,
} from './presentation'

const dailyPoints = Array.from({ length: 21 }, (_, index) => ({
  date: `2026-06-${String(index + 1).padStart(2, '0')}`,
}))

describe('analysis period presentation', () => {
  it('tách đúng 7 ngày cuối kỳ và 7 ngày liền trước', () => {
    expect(getTrailingPeriodComparison(dailyPoints, 7)).toEqual({
      current: {
        from: '2026-06-15',
        to: '2026-06-21',
      },
      previous: {
        from: '2026-06-08',
        to: '2026-06-14',
      },
    })
  })

  it('không tạo so sánh khi chưa đủ hai kỳ trọn vẹn', () => {
    expect(getTrailingPeriodComparison(dailyPoints.slice(0, 13), 7)).toBeNull()
  })

  it('lấy ngày đầu và cuối của một dãy điểm', () => {
    expect(getDatePeriod(dailyPoints.slice(2, 5))).toEqual({
      from: '2026-06-03',
      to: '2026-06-05',
    })
    expect(getDatePeriod([])).toBeNull()
  })
})
