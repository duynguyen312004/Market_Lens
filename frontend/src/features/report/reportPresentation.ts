import type {
  AnalysisDetail,
  ReportEvidence,
} from '../../api/analysesApi'
import { translate, type Language } from '../../i18n/LanguageContext'
import {
  formatInteger,
  formatPercent,
  formatVnd,
} from '../../utils/formatters'

export type ReportSource = AnalysisDetail['report']['source']

export function getReportPageTitle(
  source: ReportSource,
  language: Language = 'en',
) {
  return translate(
    language,
    source === 'ai' ? 'report.pageAi' : 'report.pageSmart',
  )
}

export function getReportSourceLabel(
  source: ReportSource,
  language: Language = 'en',
) {
  return translate(
    language,
    source === 'ai' ? 'report.sourceAi' : 'report.sourceRules',
  )
}

export function formatReportEvidence(
  evidence: ReportEvidence,
  language: Language = 'en',
) {
  if (typeof evidence.value === 'string') return evidence.value
  if (evidence.unit === 'vnd') {
    return formatVnd(evidence.value, language)
  }
  if (evidence.unit === 'percent') {
    return `${formatPercent(evidence.value, 2, false, language)}%`
  }
  if (evidence.unit === 'count' || evidence.unit === 'days') {
    return formatInteger(evidence.value, language)
  }
  return new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    maximumFractionDigits: 3,
  }).format(evidence.value)
}
