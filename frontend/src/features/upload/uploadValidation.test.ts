import { describe, expect, it } from 'vitest'

import {
  MAX_UPLOAD_BYTES,
  validateUploadCandidate,
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
    ).toBe('Chỉ hỗ trợ file CSV hoặc XLSX.')
  })

  it('rejects empty files', () => {
    expect(
      validateUploadCandidate({ name: 'sales.csv', size: 0 }),
    ).toBe('File đang rỗng. Hãy chọn file có dữ liệu.')
  })

  it('rejects files larger than 10 MB', () => {
    expect(
      validateUploadCandidate({
        name: 'sales.csv',
        size: MAX_UPLOAD_BYTES + 1,
      }),
    ).toBe('File vượt quá giới hạn 10 MB.')
  })
})
