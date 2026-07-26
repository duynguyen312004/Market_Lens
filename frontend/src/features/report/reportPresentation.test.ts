import { describe, expect, it } from 'vitest'

import {
  formatReportEvidence,
  formatReportNarrative,
  getReportPageTitle,
  getReportPrintTitle,
} from './reportPresentation'

describe('report source presentation', () => {
  it('không gắn nhãn AI cho fallback theo quy tắc', () => {
    expect(getReportPageTitle('rule_based')).toBe('Business Report')
  })

  it('chỉ dùng tên báo cáo AI khi hệ thống xác nhận nguồn AI', () => {
    expect(getReportPageTitle('ai')).toBe('AI Report')
  })

  it('tạo tên PDF gợi ý an toàn từ file và kỳ dữ liệu', () => {
    expect(
      getReportPrintTitle(
        {
          file_name: 'Doanh số tháng 7.csv',
          upload_mode: 'single',
          source_file_count: 1,
          period: {
            from: '2026-07-01',
            to: '2026-07-31',
            history_days: 31,
          },
        },
        'vi',
      ),
    ).toBe(
      'MarketLens_Bao-cao-kinh-doanh_Doanh-so-thang-7_20260701-20260731',
    )
  })

  it('đặt tên gọn cho báo cáo phân tích gộp', () => {
    expect(
      getReportPrintTitle({
        file_name: 'combined-analysis.csv',
        upload_mode: 'combined',
        source_file_count: 3,
        period: {
          from: '2026-01-01',
          to: '2026-03-31',
          history_days: 90,
        },
      }),
    ).toBe(
      'MarketLens_Business-report_3-files_20260101-20260331',
    )
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

  it('không làm hỏng số tiền đã có dấu phân cách hàng nghìn', () => {
    expect(
      formatReportNarrative(
        'The period generated 113,010,000 VND.',
      ),
    ).toBe('The period generated ₫113,010,000.')
    expect(
      formatReportNarrative(
        'Trong kỳ ghi nhận 113.010.000 VND.',
        'vi',
      ),
    ).toMatch(/^Trong kỳ ghi nhận 113\.010\.000\s₫\.$/)
  })

  it('không nhầm dấu chấm hàng nghìn tiếng Việt thành số thập phân', () => {
    expect(
      formatReportNarrative(
        'Cửa hàng hoàn tất 10.920 đơn; sản phẩm dẫn đầu bán 1.324 sản phẩm trong 1.064 đơn.',
        'vi',
      ),
    ).toBe(
      'Cửa hàng hoàn tất 10.920 đơn; sản phẩm dẫn đầu bán 1.324 sản phẩm trong 1.064 đơn.',
    )
  })

  it('sửa cách diễn đạt dấu âm thiếu tự nhiên của báo cáo AI cũ', () => {
    const result = formatReportNarrative(
      'Tăng trưởng doanh thu 7 ngày gần nhất ghi nhận mức -2,3%. Thay đổi doanh thu tháng gần nhất giảm -184.270.000 VND, tương ứng với mức tăng trưởng -29,2%.',
      'vi',
    )

    expect(result).toContain(
      'Doanh thu 7 ngày gần nhất giảm 2,3%',
    )
    expect(result).toMatch(/giảm 184\.270\.000\s₫/)
    expect(result).toContain('mức giảm 29,2%')
    expect(result).not.toMatch(/(?:giảm|tăng trưởng)\s+-/)
  })

  it('đổi thuật ngữ nội bộ trong báo cáo cũ thành cách nói dễ hiểu', () => {
    const result = formatReportNarrative(
      'Backend selected a candidate after backtests. Lift was 1.2 and confidence was 60 percent.',
      'vi',
    )

    expect(result).toContain('MarketLens')
    expect(result).toContain('cách tính được so sánh')
    expect(result).toContain('kiểm tra trên dữ liệu cũ')
    expect(result).toContain('mức phổ biến so với thông thường')
    expect(result).toContain('tỷ lệ mua kèm')
    expect(result).not.toMatch(
      /\b(?:backend|candidate|backtest|lift|confidence)\b/i,
    )
  })
})
