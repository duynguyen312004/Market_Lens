import { describe, expect, it } from 'vitest'

import {
  formatReportEvidence,
  getReportPageTitle,
  getReportSourceLabel,
} from './reportPresentation'

describe('report source presentation', () => {
  it('không gắn nhãn AI cho fallback theo quy tắc', () => {
    expect(getReportPageTitle('rule_based')).toBe('Smart Report')
    expect(getReportSourceLabel('rule_based')).toBe('Source: Automated rules')
    expect(getReportSourceLabel('rule_based')).not.toContain('AI')
  })

  it('chỉ dùng nhãn AI khi backend xác nhận source ai', () => {
    expect(getReportPageTitle('ai')).toBe('AI Report')
    expect(getReportSourceLabel('ai')).toContain('AI')
  })

  it('format evidence theo unit do backend khai báo', () => {
    expect(
      formatReportEvidence({
        metric_key: 'summary.total_revenue',
        label: 'Total revenue',
        value: 1_250_000,
        unit: 'vnd',
        context: null,
      }),
    ).toContain('₫')
    expect(
      formatReportEvidence({
        metric_key: 'summary.growth_rate_percent',
        label: 'Growth',
        value: -7.3165,
        unit: 'percent',
        context: null,
      }),
    ).toBe('-7.32%')
  })
})
