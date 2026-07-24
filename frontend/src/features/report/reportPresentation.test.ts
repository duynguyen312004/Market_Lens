import { describe, expect, it } from 'vitest'

import {
  getReportPageTitle,
  getReportSourceLabel,
} from './reportPresentation'

describe('report source presentation', () => {
  it('không gắn nhãn AI cho fallback theo quy tắc', () => {
    expect(getReportPageTitle('rule_based')).toBe('Báo cáo thông minh')
    expect(getReportSourceLabel('rule_based')).toBe('Nguồn: Quy tắc tự động')
    expect(getReportSourceLabel('rule_based')).not.toContain('AI')
  })

  it('chỉ dùng nhãn AI khi backend xác nhận source ai', () => {
    expect(getReportPageTitle('ai')).toBe('AI Report')
    expect(getReportSourceLabel('ai')).toContain('AI')
  })
})
