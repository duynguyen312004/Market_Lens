import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AnalyticsTabs } from './AnalyticsTabs'

describe('AnalyticsTabs', () => {
  it('connects each tab to its panel and exposes the active tab', () => {
    const html = renderToStaticMarkup(
      <AnalyticsTabs
        activeId="overview"
        ariaLabel="Customer analysis sections"
        idPrefix="customers"
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'behavior', label: 'Behavior groups' },
        ]}
        onChange={() => undefined}
      />,
    )

    expect(html).toContain('role="tablist"')
    expect(html).toContain('aria-label="Customer analysis sections"')
    expect(html).toContain('id="customers-tab-overview"')
    expect(html).toContain('aria-controls="customers-panel-overview"')
    expect(html).toContain('aria-selected="true"')
    expect(html).toContain('id="customers-tab-behavior"')
    expect(html).toContain('aria-selected="false"')
  })
})
