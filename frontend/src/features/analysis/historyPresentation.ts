import type { AnalysisListItem } from '../../api/analysesApi'

export const HISTORY_PAGE_SIZE = 10

export function getAnalysisStatusPresentation(
  status: AnalysisListItem['status'],
) {
  if (status === 'completed') {
    return {
      label: 'Đã hoàn thành',
      className:
        'bg-[var(--success-soft)] text-[var(--success)]',
    }
  }

  if (status === 'failed') {
    return {
      label: 'Không thành công',
      className: 'bg-[var(--danger-soft)] text-[var(--danger)]',
    }
  }

  return {
    label: 'Đang xử lý',
    className: 'bg-[var(--primary-soft)] text-[var(--primary)]',
  }
}

export function getAnalysisPeriodLabel(item: AnalysisListItem) {
  if (!item.date_from || !item.date_to) return 'Chưa có khoảng dữ liệu'
  if (item.date_from === item.date_to) return item.date_from
  return `${item.date_from} đến ${item.date_to}`
}
