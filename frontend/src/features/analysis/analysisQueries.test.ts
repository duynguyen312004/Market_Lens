import { describe, expect, it } from 'vitest'

import {
  findLatestCompletedAnalysis,
  resolveFallbackAnalysisId,
} from './analysisQueries'

describe('findLatestCompletedAnalysis', () => {
  it('chọn analysis completed đầu tiên từ danh sách mới nhất', () => {
    const result = findLatestCompletedAnalysis([
      {
        id: 'processing',
        file_name: 'processing.csv',
        status: 'processing',
        row_count: 10,
        date_from: null,
        date_to: null,
        created_at: '2026-07-24T10:00:00Z',
      },
      {
        id: 'completed',
        file_name: 'sales.csv',
        status: 'completed',
        row_count: 20,
        date_from: '2026-06-01',
        date_to: '2026-07-30',
        created_at: '2026-07-24T09:00:00Z',
      },
    ])

    expect(result?.id).toBe('completed')
  })

  it('trả null khi chưa có analysis hoàn thành', () => {
    expect(
      findLatestCompletedAnalysis([
        {
          id: 'failed',
          file_name: 'broken.csv',
          status: 'failed',
          row_count: 0,
          date_from: null,
          date_to: null,
          created_at: '2026-07-24T10:00:00Z',
        },
      ]),
    ).toBeNull()
  })

  it('phục hồi analysis mới nhất khi ID đã lưu không còn tồn tại', () => {
    expect(
      resolveFallbackAnalysisId('stale-id', [
        {
          id: 'latest-id',
          file_name: 'latest.csv',
          status: 'completed',
          row_count: 20,
          date_from: '2026-06-01',
          date_to: '2026-07-30',
          created_at: '2026-07-24T10:00:00Z',
        },
      ]),
    ).toBe('latest-id')
  })
})
