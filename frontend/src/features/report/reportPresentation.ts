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

export function getReportPrintTitle(
  analysis: Pick<
    AnalysisDetail,
    'file_name' | 'upload_mode' | 'source_file_count' | 'period'
  >,
  language: Language = 'en',
) {
  const reportLabel =
    language === 'vi' ? 'Bao-cao-kinh-doanh' : 'Business-report'
  const sourceLabel =
    analysis.upload_mode === 'combined'
      ? `${analysis.source_file_count}-files`
      : sanitizeFileName(analysis.file_name)
  const periodLabel = `${compactDate(analysis.period.from)}-${compactDate(
    analysis.period.to,
  )}`

  return `MarketLens_${reportLabel}_${sourceLabel}_${periodLabel}`
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
  const parseVnd = (token: string) => {
    const separators = token.match(/[.,]/g)?.length ?? 0
    const fractionalPart = token.split(/[.,]/).at(-1) ?? ''
    const usesGrouping =
      separators > 1 ||
      (separators === 1 && fractionalPart.length === 3)
    return Number(
      usesGrouping
        ? token.replace(/[.,]/g, '')
        : token.replace(',', '.'),
    )
  }
  const formattedCurrencies: string[] = []
  const readableValue = normalizeSignedDirection(
    replaceInternalTerms(value, language),
    language,
  )
  const withCurrencyPlaceholders = readableValue.replace(
    /(?<![\d.,])(-?\d{1,3}(?:[.,]\d{3})+|-?\d+(?:[.,]\d+)?)\s*VND\b/gi,
    (match, token: string) => {
      const parsed = parseVnd(token)
      if (!Number.isFinite(parsed)) return match
      const index = formattedCurrencies.push(
        formatVnd(parsed, language),
      ) - 1
      return `\uE000${index}\uE001`
    },
  )

  return withCurrencyPlaceholders
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
      /\uE000(\d+)\uE001/g,
      (_, index: string) => formattedCurrencies[Number(index)] ?? '',
  )
}

function normalizeSignedDirection(
  value: string,
  language: Language,
) {
  if (language === 'vi') {
    return value
      .replace(
        /\bTăng trưởng doanh thu([^.!?]{0,80}?)ghi nhận mức\s*-(?=\d)/gi,
        'Doanh thu$1giảm ',
      )
      .replace(/\bmức tăng trưởng\s*-(?=\d)/gi, 'mức giảm ')
      .replace(/\b(giảm|sụt giảm)\s*-(?=\d)/gi, '$1 ')
  }
  return value
    .replace(
      /\b(decreased?|declined?)\s+by\s+-(?=\d)/gi,
      '$1 by ',
    )
    .replace(/\b(decreased?|declined?)\s+-(?=\d)/gi, '$1 ')
    .replace(/\bgrowth\s+(?:was|is)\s+-(?=\d)/gi, 'declined by ')
}

function sanitizeFileName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '')
  const ascii = withoutExtension
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replaceAll('đ', 'd')
    .replaceAll('Đ', 'D')
  const safeName = ascii
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  return safeName || 'sales-data'
}

function compactDate(value: string) {
  return value.replaceAll('-', '')
}

function replaceInternalTerms(value: string, language: Language) {
  const replacements: Array<[RegExp, string]> =
    language === 'vi'
      ? [
          [/\bbackends?\b/gi, 'MarketLens'],
          [/\bbacktests?\b/gi, 'kiểm tra trên dữ liệu cũ'],
          [/\bbaselines?\b/gi, 'cách tính tuần đơn giản'],
          [/\bfolds?\b/gi, 'giai đoạn thử'],
          [/\bcandidates?\b/gi, 'cách tính được so sánh'],
          [/\bRFM\b/gi, 'cách chia nhóm khách theo hành vi'],
          [/\bcohorts?\b/gi, 'nhóm khách theo tháng bắt đầu mua'],
          [/\bMAE\b/gi, 'mức lệch trung bình mỗi ngày'],
          [
            /\bRMSE\b/gi,
            'mức lệch khi ưu tiên các ngày sai nhiều',
          ],
          [/\bsMAPE\b/gi, 'mức lệch trung bình theo phần trăm'],
          [/\blift\b/gi, 'mức phổ biến so với thông thường'],
          [/\bconfidence\b/gi, 'tỷ lệ mua kèm'],
          [/\bsupport\b/gi, 'tỷ lệ đơn có cả hai sản phẩm'],
          [/\bmetric[_ ]keys?\b/gi, 'chỉ số tham chiếu'],
        ]
      : [
          [/\bbackends?\b/gi, 'MarketLens'],
          [/\bbacktests?\b/gi, 'historical tests'],
          [/\bbaselines?\b/gi, 'simple weekly estimate'],
          [/\bfolds?\b/gi, 'test periods'],
          [/\bcandidates?\b/gi, 'compared methods'],
          [/\bRFM\b/gi, 'customer behavior grouping'],
          [/\bcohorts?\b/gi, 'monthly customer groups'],
          [/\bMAE\b/gi, 'average daily difference'],
          [
            /\bRMSE\b/gi,
            'difference with extra weight on large misses',
          ],
          [/\bsMAPE\b/gi, 'average percentage difference'],
          [/\blift\b/gi, 'compared with usual'],
          [/\bconfidence\b/gi, 'bought-together rate'],
          [/\bsupport\b/gi, 'orders containing both products'],
          [/\bmetric[_ ]keys?\b/gi, 'referenced figures'],
        ]

  return replacements.reduce(
    (result, [pattern, replacement]) =>
      result.replace(pattern, replacement),
    value,
  )
}
