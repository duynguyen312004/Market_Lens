import type {
  AnalysisDetail,
  ReportEvidence,
} from '../../api/analysesApi'
import { translate, type Language } from '../../i18n/LanguageContext'
import {
  formatDecimal,
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
    return `${formatPercent(evidence.value, 1, false, language)}%`
  }
  if (evidence.unit === 'count' || evidence.unit === 'days') {
    return formatInteger(evidence.value, language)
  }
  return formatDecimal(evidence.value, 2, language)
}

export function formatReportNarrative(
  value: string,
  language: Language = 'en',
) {
  const parseDecimal = (token: string) =>
    Number(token.replace(',', '.'))

  return value
    .replace(
      /(-?\d+(?:\.\d{2,}|,\d{4,}))\s*(?:percent|%)/gi,
      (match, token: string) => {
        const parsed = parseDecimal(token)
        return Number.isFinite(parsed)
          ? `${formatPercent(parsed, 1, false, language)}%`
          : match
      },
    )
    .replace(
      /(?<![\d.,])-?\d+\.\d{3,}(?![\d.,])/g,
      (token) => formatDecimal(Number(token), 2, language),
    )
    .replace(
      /(?<![\d.,])-?\d+,\d{4,}(?![\d.,])/g,
      (token) =>
        formatDecimal(parseDecimal(token), 2, language),
    )
    .replace(
      /(-?\d+(?:[.,]\d+)?)\s*VND\b/gi,
      (match, token: string) => {
        const parsed = parseDecimal(token)
        return Number.isFinite(parsed)
          ? formatVnd(parsed, language)
          : match
      },
    )
}
