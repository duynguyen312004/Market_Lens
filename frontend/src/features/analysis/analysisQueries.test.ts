import { describe, expect, it } from 'vitest'

import {
  analysisKeys,
  deriveAnalysisViewState,
} from './analysisQueries'

describe('analysis query keys', () => {
  it('isolates list and detail caches by authenticated user', () => {
    expect(analysisKeys.list('user-one', 20, 0)).not.toEqual(
      analysisKeys.list('user-two', 20, 0),
    )
    expect(analysisKeys.detail('user-one', 'analysis-one')).not.toEqual(
      analysisKeys.detail('user-two', 'analysis-one'),
    )
    expect(analysisKeys.all('user-one')).toEqual([
      'users',
      'user-one',
      'analyses',
    ])
  })
})

describe('deriveAnalysisViewState', () => {
  it('hiển thị lựa chọn dữ liệu ngay khi phiên chưa chọn analysis', () => {
    expect(
      deriveAnalysisViewState({
        hasActiveId: false,
        hasAnalysis: false,
        hasError: false,
        activeIsMissing: false,
        isDetailPending: false,
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
        activeIsMissing: false,
        isDetailPending: true,
      }),
    ).toEqual({
      isEmpty: false,
      isLoading: true,
    })
  })

  it('quay về lựa chọn dữ liệu khi analysis đã chọn không còn tồn tại', () => {
    expect(
      deriveAnalysisViewState({
        hasActiveId: true,
        hasAnalysis: false,
        hasError: false,
        activeIsMissing: true,
        isDetailPending: false,
      }),
    ).toEqual({
      isEmpty: true,
      isLoading: false,
    })
  })
})
