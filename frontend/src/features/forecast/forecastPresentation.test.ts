import { describe, expect, it } from 'vitest'

import type { ForecastResult } from '../../api/analysesApi'
import {
  buildForecastChartData,
  getForecastChangeTone,
  getForecastMethodLabel,
} from './forecastPresentation'

const forecast: ForecastResult = {
  available: true,
  method: 'linear_trend_30_days',
  history_days: 60,
  forecast_days: 7,
  forecast_total: 15_450_331,
  change_vs_last_7_days_percent: 2.4,
  points: Array.from({ length: 7 }, (_, index) => ({
    date: `2026-07-${String(index + 1).padStart(2, '0')}`,
    predicted_revenue: 1_000_000 + index,
  })),
  disclaimer: 'Dự báo chỉ mang tính tham khảo.',
}

describe('forecast presentation', () => {
  it('giới hạn phần actual ở 30 ngày và giữ đủ 7 điểm forecast', () => {
    const actual = Array.from({ length: 60 }, (_, index) => ({
      date: `2026-06-${String((index % 30) + 1).padStart(2, '0')}`,
      revenue: index,
    }))

    const result = buildForecastChartData(actual, forecast)

    expect(result).toHaveLength(37)
    expect(result.filter((point) => point.actual !== undefined)).toHaveLength(
      30,
    )
    expect(
      result.filter((point) => point.predicted !== undefined),
    ).toHaveLength(7)
  })

  it('hiển thị tên phương pháp thay vì mã kỹ thuật', () => {
    expect(getForecastMethodLabel('moving_average_7_days')).toBe(
      'Trung bình trượt 7 ngày',
    )
    expect(getForecastMethodLabel('linear_trend_30_days')).toBe(
      'Xu hướng tuyến tính 30 ngày',
    )
  })

  it('phân loại đúng chiều thay đổi forecast', () => {
    expect(getForecastChangeTone(4)).toBe('positive')
    expect(getForecastChangeTone(-4)).toBe('negative')
    expect(getForecastChangeTone(null)).toBe('neutral')
  })
})
