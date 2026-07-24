import { describe, expect, it } from 'vitest'

import {
  getAnalysisPeriodLabel,
  getAnalysisStatusPresentation,
} from './historyPresentation'

const baseItem = {
  id: 'analysis-id',
  file_name: 'sales.csv',
  status: 'completed' as const,
  row_count: 120,
  date_from: '2026-07-01',
  date_to: '2026-07-24',
  created_at: '2026-07-24T10:00:00Z',
}

describe('history presentation', () => {
  it('hiển thị đúng trạng thái analysis', () => {
    expect(getAnalysisStatusPresentation('completed').label).toBe(
      'Đã hoàn thành',
    )
    expect(getAnalysisStatusPresentation('processing').label).toBe(
      'Đang xử lý',
    )
    expect(getAnalysisStatusPresentation('failed').label).toBe(
      'Không thành công',
    )
  })

  it('mô tả khoảng dữ liệu mà không thay đổi date-only', () => {
    expect(getAnalysisPeriodLabel(baseItem)).toBe(
      '2026-07-01 đến 2026-07-24',
    )
    expect(
      getAnalysisPeriodLabel({
        ...baseItem,
        date_from: '2026-07-24',
        date_to: '2026-07-24',
      }),
    ).toBe('2026-07-24')
    expect(
      getAnalysisPeriodLabel({
        ...baseItem,
        date_from: null,
        date_to: null,
      }),
    ).toBe('Chưa có khoảng dữ liệu')
  })
})
