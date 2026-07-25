import { translate, type Language } from '../../i18n/LanguageContext'
import type { AnalysisDetail } from '../../api/analysesApi'

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
