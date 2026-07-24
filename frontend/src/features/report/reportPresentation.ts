import type { AnalysisDetail } from '../../api/analysesApi'

export type ReportSource = AnalysisDetail['report']['source']

export function getReportPageTitle(source: ReportSource) {
  return source === 'ai' ? 'AI Report' : 'Báo cáo thông minh'
}

export function getReportSourceLabel(source: ReportSource) {
  return source === 'ai'
    ? 'Nguồn: External AI'
    : 'Nguồn: Quy tắc tự động'
}
