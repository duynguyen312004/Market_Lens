import type {
  AnalysisDetail,
  ForecastMethod,
  ForecastResult,
} from '../../api/analysesApi'
import { translate, type Language } from '../../i18n/LanguageContext'

export type ForecastChartPoint = {
  date: string
  actual?: number
  predicted?: number
  interval?: [number, number]
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
    interval:
      point.lower_bound !== null && point.upper_bound !== null
        ? ([point.lower_bound, point.upper_bound] as [number, number])
        : undefined,
  }))
  return [...visibleActual, ...predicted]
}

export function getForecastMethodLabel(
  method: ForecastMethod | null,
  language: Language = 'en',
) {
  const labels: Record<string, string> = {
    seasonal_naive_7_days: translate(
      language,
      'forecast.methodSeasonalNaive',
    ),
    moving_average_7_days: translate(language, 'forecast.methodMovingAverage'),
    weekday_average_4_weeks: translate(
      language,
      'forecast.methodWeekdayAverage',
    ),
    linear_trend_30_days: translate(language, 'forecast.methodLinearTrend'),
  }
  return method
    ? labels[method] ?? method
    : translate(language, 'forecast.methodUnavailable')
}

export function getForecastChangeTone(change: number | null) {
  if (change === null || change === 0) return 'neutral' as const
  return change > 0 ? ('positive' as const) : ('negative' as const)
}

export function getForecastReliabilityLabel(
  reliability: ForecastResult['evaluation']['reliability'],
  language: Language = 'en',
) {
  return translate(language, `forecast.reliability.${reliability}`)
}

export function getForecastReliabilityTone(
  reliability: ForecastResult['evaluation']['reliability'],
) {
  if (reliability === 'high') return 'positive' as const
  if (reliability === 'medium') return 'warning' as const
  if (reliability === 'low') return 'negative' as const
  return 'neutral' as const
}
