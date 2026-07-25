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

  it('provides localized, interpolated E2 methodology copy', () => {
    expect(
      translate('vi', 'rfm.insufficientDesc', {
        actual: 4,
        minimum: 5,
      }),
    ).toBe(
      'Analysis này có 4 khách hàng; cần ít nhất 5 để chấm điểm phân vị có ý nghĩa.',
    )
    expect(
      translate('en', 'pairs.skipped', {
        count: 2,
        maximum: 50,
      }),
    ).toContain('2 oversized orders')
    expect(translate('vi', 'rfm.segment.at_risk')).toBe(
      'Có nguy cơ rời bỏ',
    )
  })
})
