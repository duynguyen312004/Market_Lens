import { describe, expect, it } from 'vitest'

import type { ForecastResult } from '../../api/analysesApi'
import {
  buildForecastChartData,
  getForecastChangeTone,
  getForecastMethodLabel,
  getForecastReliabilityLabel,
  getForecastReliabilityTone,
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
    lower_bound: 800_000 + index,
    upper_bound: 1_200_000 + index,
  })),
  selection: {
    available: true,
    reason: null,
    strategy: 'rolling_origin_candidate_comparison',
    primary_metric: 'mae',
    simplicity_tolerance_percent: 5,
    minimum_fold_count: 2,
    maximum_fold_count: 8,
    minimum_history_days: 28,
    fold_count: 4,
    evaluation_points: 28,
    selected_method: 'linear_trend_30_days',
    selection_reason: 'LOWEST_MAE',
    candidates: [],
  },
  evaluation: {
    available: true,
    reason: null,
    strategy: 'rolling_origin_selected_method',
    evaluated_method: 'linear_trend_30_days',
    baseline_method: 'seasonal_naive_7_days',
    horizon_days: 7,
    minimum_fold_count: 2,
    maximum_fold_count: 8,
    minimum_history_days: 28,
    fold_count: 4,
    evaluation_points: 28,
    model_metrics: {
      mae: 856_855.5,
      rmse: 1_034_308.06,
      smape_percent: 42.263957,
    },
    baseline_metrics: {
      mae: 1_223_928.57,
      rmse: 1_432_915.36,
      smape_percent: 67.306507,
    },
    mae_improvement_vs_baseline_percent: 29.99138,
    reliability: 'low',
    folds: [],
  },
  uncertainty: {
    available: true,
    reason: null,
    method: 'empirical_absolute_error_quantile',
    target_coverage_percent: 80,
    residual_count: 28,
    absolute_error_quantile: 200_000,
    observed_backtest_coverage_percent: 82.142857,
  },
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
    expect(result.at(-1)?.interval).toEqual([800_006, 1_200_006])
  })

  it('hiển thị tên phương pháp thay vì mã kỹ thuật', () => {
    expect(getForecastMethodLabel('moving_average_7_days')).toBe(
      'Average of the latest 7 days',
    )
    expect(getForecastMethodLabel('linear_trend_30_days')).toBe(
      '30-day revenue trend',
    )
    expect(getForecastMethodLabel('seasonal_naive_7_days')).toBe(
      'Same weekday as last week',
    )
    expect(getForecastMethodLabel('weekday_average_4_weeks', 'vi')).toBe(
      'Trung bình theo thứ trong 4 tuần',
    )
    expect(getForecastMethodLabel('moving_average_7_days', 'vi')).toBe(
      'Trung bình 7 ngày gần nhất',
    )
  })

  it('phân loại đúng chiều thay đổi forecast', () => {
    expect(getForecastChangeTone(4)).toBe('positive')
    expect(getForecastChangeTone(-4)).toBe('negative')
    expect(getForecastChangeTone(null)).toBe('neutral')
  })

  it('dịch và phân loại mức độ bằng chứng backtest', () => {
    expect(getForecastReliabilityLabel('high')).toBe('High')
    expect(getForecastReliabilityLabel('medium', 'vi')).toBe('Trung bình')
    expect(getForecastReliabilityTone('high')).toBe('positive')
    expect(getForecastReliabilityTone('medium')).toBe('warning')
    expect(getForecastReliabilityTone('low')).toBe('negative')
    expect(getForecastReliabilityTone('unavailable')).toBe('neutral')
  })
})
