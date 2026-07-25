import { describe, expect, it } from 'vitest'

import {
  formatReportEvidence,
  formatReportNarrative,
  getReportPageTitle,
  getReportSourceLabel,
} from './reportPresentation'

describe('report source presentation', () => {
  it('không gắn nhãn AI cho fallback theo quy tắc', () => {
    expect(getReportPageTitle('rule_based')).toBe('Business Report')
    expect(getReportSourceLabel('rule_based')).toBe('Type: Automatic summary')
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
    ).toBe('-7.3%')
  })

  it('làm tròn số trong nội dung AI cũ trước khi hiển thị', () => {
    expect(
      formatReportNarrative(
        'Revenue was 113010000 VND and changed by 37.201646 percent.',
      ),
    ).toBe('Revenue was ₫113,010,000 and changed by 37.2%.')
    expect(
      formatReportNarrative(
        'Doanh thu 413956.04 VND, thay đổi 8,626198%.',
        'vi',
      ),
    ).toMatch(/^Doanh thu 413\.956\s₫, thay đổi 8,6%\.$/)
  })
})
