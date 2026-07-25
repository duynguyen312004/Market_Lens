import { describe, expect, it } from 'vitest'

import {
  MAX_UPLOAD_BYTES,
  getUploadColumnLabel,
  getUploadReasonLabel,
  validateUploadCandidate,
  validateUploadSelection,
} from './uploadValidation'

describe('validateUploadCandidate', () => {
  it('accepts CSV and XLSX case-insensitively', () => {
    expect(
      validateUploadCandidate({ name: 'sales.CSV', size: 100 }),
    ).toBeNull()
    expect(
      validateUploadCandidate({ name: 'sales.xlsx', size: 100 }),
    ).toBeNull()
  })

  it('rejects unknown extensions', () => {
    expect(
      validateUploadCandidate({ name: 'sales.xls', size: 100 }),
    ).toBe('Only CSV and XLSX files are supported.')
  })

  it('rejects empty files', () => {
    expect(
      validateUploadCandidate({ name: 'sales.csv', size: 0 }),
    ).toBe('The file is empty. Choose a file that contains data.')
  })

  it('rejects files larger than 10 MB', () => {
    expect(
      validateUploadCandidate({
        name: 'sales.csv',
        size: MAX_UPLOAD_BYTES + 1,
      }),
    ).toBe('The file exceeds the 10 MB limit.')
  })

  it('localizes backend row-validation details', () => {
    expect(getUploadColumnLabel('order_date', 'vi')).toBe('Ngày đặt hàng')
    expect(getUploadReasonLabel('invalid_date', 'vi')).toBe(
      'phải theo định dạng YYYY-MM-DD',
    )
    expect(getUploadReasonLabel('unknown_rule', 'vi')).toBe('unknown rule')
  })
})

describe('validateUploadSelection', () => {
  it('requires two files in combined mode', () => {
    expect(
      validateUploadSelection(
        [{ name: 'sales.csv', size: 100 }],
        'combined',
      ),
    ).toBe('Select at least two files to combine.')
  })

  it('rejects duplicate names case-insensitively', () => {
    expect(
      validateUploadSelection(
        [
          { name: 'sales.csv', size: 100 },
          { name: 'SALES.CSV', size: 100 },
        ],
        'combined',
      ),
    ).toBe('Each selected file must have a unique file name.')
  })

  it('applies the size limit to the whole selection', () => {
    expect(
      validateUploadSelection(
        [
          { name: 'one.csv', size: MAX_UPLOAD_BYTES / 2 + 1 },
          { name: 'two.csv', size: MAX_UPLOAD_BYTES / 2 },
        ],
        'combined',
      ),
    ).toBe('The selected files exceed the combined 10 MB limit.')
  })
})
