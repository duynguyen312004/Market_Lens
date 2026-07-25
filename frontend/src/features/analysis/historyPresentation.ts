import type { AnalysisListItem } from '../../api/analysesApi'
import { translate, type Language } from '../../i18n/LanguageContext'
import { formatDate } from '../../utils/formatters'

export const HISTORY_PAGE_SIZE = 10

export function getAnalysisStatusPresentation(
  status: AnalysisListItem['status'],
  language: Language = 'en',
) {
  if (status === 'completed') {
    return {
      label: translate(language, 'history.completed'),
      className:
        'bg-[var(--success-soft)] text-[var(--success)]',
    }
  }

  if (status === 'failed') {
    return {
      label: translate(language, 'history.failed'),
      className: 'bg-[var(--danger-soft)] text-[var(--danger)]',
    }
  }

  return {
    label: translate(language, 'history.processing'),
    className: 'bg-[var(--primary-soft)] text-[var(--primary)]',
  }
}

export function getAnalysisPeriodLabel(
  item: AnalysisListItem,
  language: Language = 'en',
) {
  if (!item.date_from || !item.date_to) {
    return translate(language, 'history.noPeriod')
  }
  if (item.date_from === item.date_to) {
    return formatDate(item.date_from, language)
  }
  return translate(language, 'common.dateRange', {
    from: formatDate(item.date_from, language),
    to: formatDate(item.date_to, language),
  })
}
