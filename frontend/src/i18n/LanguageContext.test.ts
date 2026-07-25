import { describe, expect, it } from 'vitest'

import { translate, translations } from './LanguageContext'

describe('MarketLens translations', () => {
  it('provides non-empty English and Vietnamese copy for every key', () => {
    for (const [key, value] of Object.entries(translations)) {
      expect(value.en.trim(), `${key} is missing English copy`).not.toBe('')
      expect(value.vi.trim(), `${key} is missing Vietnamese copy`).not.toBe('')
    }
  })

  it('interpolates parameters without leaving template tokens behind', () => {
    expect(
      translate('en', 'common.rowsProcessed', { count: '1,250' }),
    ).toBe('1,250 rows processed')
    expect(
      translate('vi', 'common.rowsProcessed', { count: '1.250' }),
    ).toBe('Đã xử lý 1.250 dòng')
  })

  it('falls back to the key for an unknown translation', () => {
    expect(translate('vi', 'missing.translation')).toBe(
      'missing.translation',
    )
  })

  it('provides localized, plain-language analytics copy', () => {
    expect(
      translate('vi', 'rfm.insufficientDesc', {
        actual: 4,
        minimum: 5,
      }),
    ).toBe(
      'Dữ liệu hiện có 4 khách hàng. Cần ít nhất 5 khách để so sánh hành vi mua sắm hợp lý.',
    )
    expect(
      translate('en', 'pairs.skipped', {
        count: 2,
        maximum: 50,
      }),
    ).toContain('2 oversized orders')
    expect(translate('vi', 'rfm.segment.at_risk')).toBe(
      'Lâu chưa quay lại',
    )
    expect(translate('vi', 'dashboard.uniqueOrders')).toBe(
      'Mỗi đơn hàng chỉ được tính một lần',
    )
    expect(
      translate('vi', 'rfm.snapshotExplain', {
        date: '21/07/2026',
      }),
    ).toBe(
      'Số ngày chưa mua được tính đến 21/07/2026, là ngày kế tiếp sau đơn hoàn tất mới nhất trong file.',
    )
    expect(translate('vi', 'common.dateFormatHint')).toBe(
      '(ngày/tháng/năm)',
    )
    expect(
      translate('vi', 'sales.periodDescMonth', {
        month: 'tháng 7/2026',
      }),
    ).toBe('Doanh thu theo từng ngày trong tháng 7/2026.')
  })

  it('keeps internal engineering terms out of key Vietnamese guidance', () => {
    const publicCopy = [
      translate('vi', 'forecast.selectionUnavailableDesc', {
        current: 20,
        minimum: 28,
      }),
      translate('vi', 'forecast.evaluationUnavailableDesc', {
        current: 20,
        minimum: 28,
      }),
      translate('vi', 'report.actionDescRules'),
      translate('vi', 'rfm.desc'),
      translate('vi', 'pairs.desc'),
    ]
      .join(' ')
      .toLowerCase()

    for (const internalTerm of [
      'backend',
      'candidate',
      'fallback',
      'fold',
      'metric key',
      'residual',
    ]) {
      expect(publicCopy).not.toContain(internalTerm)
    }
  })
})
