import { describe, expect, it } from 'vitest'

import {
  getAnalysisPeriodLabel,
  getAnalysisStatusPresentation,
} from './historyPresentation'

const baseItem = {
  id: 'analysis-id',
  file_name: 'sales.csv',
  upload_mode: 'single' as const,
  source_file_count: 1,
  status: 'completed' as const,
  row_count: 120,
  date_from: '2026-07-01',
  date_to: '2026-07-24',
  created_at: '2026-07-24T10:00:00Z',
}

describe('history presentation', () => {
  it('hiển thị đúng trạng thái analysis', () => {
    expect(getAnalysisStatusPresentation('completed').label).toBe(
      'Completed',
    )
    expect(getAnalysisStatusPresentation('processing').label).toBe(
      'Processing',
    )
    expect(getAnalysisStatusPresentation('failed').label).toBe(
      'Failed',
    )
  })

  it('mô tả khoảng dữ liệu mà không thay đổi date-only', () => {
    expect(getAnalysisPeriodLabel(baseItem)).toBe(
      '07/01/2026 to 07/24/2026',
    )
    expect(
      getAnalysisPeriodLabel({
        ...baseItem,
        date_from: '2026-07-24',
        date_to: '2026-07-24',
      }),
    ).toBe('07/24/2026')
    expect(
      getAnalysisPeriodLabel({
        ...baseItem,
        date_from: null,
        date_to: null,
      }),
    ).toBe('No data period')
    expect(getAnalysisPeriodLabel(baseItem, 'vi')).toBe(
      '01/07/2026 đến 24/07/2026',
    )
  })
})
