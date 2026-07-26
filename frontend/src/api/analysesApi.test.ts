import { describe, expect, it } from 'vitest'

import { buildImportRequestFormData } from './analysesApi'

describe('buildImportRequestFormData', () => {
  it('gửi source, mapping và status mapping cùng file preview', () => {
    const file = new File(['Order ID,Status\nA-1,Done'], 'orders.csv', {
      type: 'text/csv',
    })

    const formData = buildImportRequestFormData(
      [{ fieldName: 'file', file }],
      {
        source_type: 'custom',
        column_mapping: {
          order_id: 'Order ID',
          order_status: 'Status',
        },
        status_mapping: {
          Done: 'completed',
        },
      },
    )

    expect(formData.get('file')).toBe(file)
    expect(formData.get('source_type')).toBe('custom')
    expect(JSON.parse(String(formData.get('column_mapping')))).toEqual({
      order_id: 'Order ID',
      order_status: 'Status',
    })
    expect(JSON.parse(String(formData.get('status_mapping')))).toEqual({
      Done: 'completed',
    })
  })

  it('gửi profile id thay cho mapping thủ công', () => {
    const file = new File(['x'], 'orders.xlsx')

    const formData = buildImportRequestFormData(
      [{ fieldName: 'file', file }],
      {
        source_type: 'shopee',
        import_profile_id: '11111111-1111-1111-1111-111111111111',
      },
    )

    expect(formData.get('source_type')).toBe('shopee')
    expect(formData.get('import_profile_id')).toBe(
      '11111111-1111-1111-1111-111111111111',
    )
    expect(formData.has('column_mapping')).toBe(false)
    expect(formData.has('status_mapping')).toBe(false)
  })
})
