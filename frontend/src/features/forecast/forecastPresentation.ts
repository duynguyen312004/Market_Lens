import type { AnalysisDetail, ForecastResult } from '../../api/analysesApi'

export type ForecastChartPoint = {
  date: string
  actual?: number
  predicted?: number
}

export function buildForecastChartData(
  actualPoints: AnalysisDetail['revenue_by_date'],
  forecast: ForecastResult,
): ForecastChartPoint[] {
  const visibleActual = actualPoints.slice(-30).map((point) => ({
    date: point.date,
    actual: point.revenue,
  }))
  const predicted = forecast.points.map((point) => ({
    date: point.date,
    predicted: point.predicted_revenue,
  }))
  return [...visibleActual, ...predicted]
}

export function getForecastMethodLabel(method: string | null) {
  const labels: Record<string, string> = {
    moving_average_7_days: 'Trung bình trượt 7 ngày',
    linear_trend_30_days: 'Xu hướng tuyến tính 30 ngày',
  }
  return method ? labels[method] ?? method : 'Chưa có phương pháp'
}

export function getForecastChangeTone(change: number | null) {
  if (change === null || change === 0) return 'neutral' as const
  return change > 0 ? ('positive' as const) : ('negative' as const)
}
