import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { SortableTableHeader } from './SortableTableHeader'

describe('SortableTableHeader', () => {
  it('exposes the active direction and an accessible sort action', () => {
    const html = renderToStaticMarkup(
      <table>
        <thead>
          <tr>
            <SortableTableHeader
              defaultDirection="desc"
              label="Doanh thu"
              onSort={vi.fn()}
              sortKey="revenue"
              sortLabel="Sắp xếp theo Doanh thu"
              sortState={{
                key: 'revenue',
                direction: 'desc',
              }}
            />
          </tr>
        </thead>
      </table>,
    )

    expect(html).toContain('aria-sort="descending"')
    expect(html).toContain('aria-label="Sắp xếp theo Doanh thu"')
    expect(html).toContain('Doanh thu')
  })

  it('starts without claiming a sort direction when the default order is curated', () => {
    const html = renderToStaticMarkup(
      <table>
        <thead>
          <tr>
            <SortableTableHeader
              defaultDirection="desc"
              label="Tỷ lệ hủy hoặc trả"
              onSort={vi.fn()}
              sortKey="issueRate"
              sortLabel="Sắp xếp theo Tỷ lệ hủy hoặc trả"
              sortState={null}
            />
          </tr>
        </thead>
      </table>,
    )

    expect(html).toContain('aria-sort="none"')
    expect(html).toContain('Tỷ lệ hủy hoặc trả')
  })
})
