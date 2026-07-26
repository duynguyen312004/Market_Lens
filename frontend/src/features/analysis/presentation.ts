import { translate, type Language } from '../../i18n/LanguageContext'
import type { AnalysisDetail } from '../../api/analysesApi'

export type DatePeriod = {
  from: string
  to: string
}

export type TrailingPeriodComparison = {
  current: DatePeriod
  previous: DatePeriod
}

export function getDatePeriod(
  points: Array<{ date: string }>,
): DatePeriod | null {
  if (points.length === 0) return null
  return {
    from: points[0].date,
    to: points[points.length - 1].date,
  }
}

export function getTrailingPeriodComparison(
  points: Array<{ date: string }>,
  periodDays: number,
): TrailingPeriodComparison | null {
  if (
    !Number.isInteger(periodDays) ||
    periodDays <= 0 ||
    points.length < periodDays * 2
  ) {
    return null
  }

  const current = points.slice(-periodDays)
  const previous = points.slice(-periodDays * 2, -periodDays)
  const currentPeriod = getDatePeriod(current)
  const previousPeriod = getDatePeriod(previous)
  if (!currentPeriod || !previousPeriod) return null

  return {
    current: currentPeriod,
    previous: previousPeriod,
  }
}

export function getAnalysisFileLabel(
  analysis: AnalysisDetail,
  language: Language = 'en',
) {
  return analysis.upload_mode === 'combined'
    ? translate(language, 'analysis.combinedFiles', {
        count: analysis.source_file_count,
      })
    : analysis.file_name
}

export function getAnalysisSourceNames(analysis: AnalysisDetail) {
  return analysis.upload.source_files
    .map((source) => source.file_name)
    .join(', ')
}

export function formatAnalysisWarning(
  warning: string,
  language: Language = 'en',
) {
  const labels: Record<string, string> = {
    INSUFFICIENT_HISTORY: translate(
      language,
      'analysis.warningInsufficientHistory',
    ),
    NO_COMPARABLE_PREVIOUS_REVENUE: translate(
      language,
      'analysis.warningNoPreviousRevenue',
    ),
    DUPLICATE_ORDERS_REMOVED: translate(
      language,
      'analysis.warningDuplicateOrders',
    ),
    NON_FINAL_ORDERS_SKIPPED: translate(
      language,
      'analysis.warningNonFinalOrdersSkipped',
    ),
    CUSTOMER_ANALYTICS_UNAVAILABLE: translate(
      language,
      'upload.warningNoCustomerIdentifiers',
    ),
    CATEGORY_DEFAULTED: translate(
      language,
      'upload.warningNoCategory',
    ),
    DISCOUNT_BREAKDOWN_UNAVAILABLE: translate(
      language,
      'upload.warningNoDiscount',
    ),
    SOURCE_SELECTION_DIFFERS_FROM_DETECTION: translate(
      language,
      'upload.warningSourceMismatch',
    ),
  }
  return labels[warning] ?? warning
}

export function getSegmentLabel(
  segment: 'new' | 'returning' | 'vip',
  language: Language = 'en',
) {
  const labels = {
    new: translate(language, 'analysis.segmentNew'),
    returning: translate(language, 'analysis.segmentReturning'),
    vip: 'VIP',
  }
  return labels[segment]
}
