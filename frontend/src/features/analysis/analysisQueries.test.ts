import { describe, expect, it } from 'vitest'

import {
  deriveAnalysisViewState,
  findLatestCompletedAnalysis,
  resolveFallbackAnalysisId,
} from './analysisQueries'

describe('findLatestCompletedAnalysis', () => {
  it('chọn analysis completed đầu tiên từ danh sách mới nhất', () => {
    const result = findLatestCompletedAnalysis([
      {
        id: 'processing',
        file_name: 'processing.csv',
        upload_mode: 'single',
        source_file_count: 1,
        status: 'processing',
        row_count: 10,
        date_from: null,
        date_to: null,
        created_at: '2026-07-24T10:00:00Z',
      },
      {
        id: 'completed',
        file_name: 'sales.csv',
        upload_mode: 'single',
        source_file_count: 1,
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
          upload_mode: 'single',
          source_file_count: 1,
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
          upload_mode: 'single',
          source_file_count: 1,
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

describe('deriveAnalysisViewState', () => {
  it('hiển thị empty state thay vì loading vô hạn khi tài khoản chưa có analysis', () => {
    expect(
      deriveAnalysisViewState({
        hasActiveId: false,
        hasAnalysis: false,
        hasError: false,
        hasLatestAnalysis: false,
        hasPreferredId: false,
        isDetailPending: false,
        isListSuccess: true,
        preferredIsMissing: false,
      }),
    ).toEqual({
      isEmpty: true,
      isLoading: false,
    })
  })

  it('giữ loading trong lúc đang tìm analysis hiện tại', () => {
    expect(
      deriveAnalysisViewState({
        hasActiveId: true,
        hasAnalysis: false,
        hasError: false,
        hasLatestAnalysis: true,
        hasPreferredId: true,
        isDetailPending: true,
        isListSuccess: true,
        preferredIsMissing: false,
      }),
    ).toEqual({
      isEmpty: false,
      isLoading: true,
    })
  })
})
