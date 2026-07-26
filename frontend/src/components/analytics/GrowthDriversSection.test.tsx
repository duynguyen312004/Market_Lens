import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { GrowthDriverAnalysis } from '../../api/analysesApi'
import { LanguageProvider } from '../../i18n/LanguageContext'
import { GrowthDriversSection } from './GrowthDriversSection'

const analysis: GrowthDriverAnalysis = {
  default_comparison_type: 'month',
  periods: [
    {
      available: false,
      reason: 'INSUFFICIENT_COMPARISON_HISTORY',
      comparison_type: 'year',
      required_history_from: '2025-01-01',
      current_period: {
        from: '2026-01-01',
        to: '2026-07-30',
      },
      previous_period: {
        from: '2025-01-01',
        to: '2025-07-30',
      },
      current_revenue: null,
      previous_revenue: null,
      net_revenue_change: null,
      growth_rate_percent: null,
      positive_revenue_change: null,
      negative_revenue_change: null,
      evaluated_product_count: 0,
      evaluated_category_count: 0,
      product_growth_drivers: [],
      product_decline_drivers: [],
      category_growth_drivers: [],
      category_decline_drivers: [],
    },
    {
      available: true,
      reason: null,
      comparison_type: 'month',
      required_history_from: '2026-06-01',
      current_period: {
        from: '2026-07-01',
        to: '2026-07-30',
      },
      previous_period: {
        from: '2026-06-01',
        to: '2026-06-30',
      },
      current_revenue: 120_000_000,
      previous_revenue: 100_000_000,
      net_revenue_change: 20_000_000,
      growth_rate_percent: 20,
      positive_revenue_change: 30_000_000,
      negative_revenue_change: 10_000_000,
      evaluated_product_count: 2,
      evaluated_category_count: 1,
      product_growth_drivers: [
        {
          product_id: 'P001',
          product_name: 'Sản phẩm tăng mạnh',
          category: 'Danh mục A',
          comparison_type: 'month',
          current_revenue: 50_000_000,
          previous_revenue: 20_000_000,
          revenue_change: 30_000_000,
          growth_rate_percent: 150,
          current_order_count: 50,
          previous_order_count: 20,
          order_count_change: 30,
          current_quantity: 60,
          previous_quantity: 25,
          quantity_change: 35,
          change_type: 'growing',
          contribution_to_direction_percent: 100,
        },
      ],
      product_decline_drivers: [
        {
          product_id: 'P002',
          product_name: 'Sản phẩm đang giảm',
          category: 'Danh mục B',
          comparison_type: 'month',
          current_revenue: 10_000_000,
          previous_revenue: 20_000_000,
          revenue_change: -10_000_000,
          growth_rate_percent: -50,
          current_order_count: 10,
          previous_order_count: 20,
          order_count_change: -10,
          current_quantity: 10,
          previous_quantity: 20,
          quantity_change: -10,
          change_type: 'declining',
          contribution_to_direction_percent: 100,
        },
      ],
      category_growth_drivers: [],
      category_decline_drivers: [],
    },
  ],
}

describe('GrowthDriversSection', () => {
  it('shows the preferred period and separates increases from decreases', () => {
    const html = renderToStaticMarkup(
      <LanguageProvider>
        <GrowthDriversSection analysis={analysis} />
      </LanguageProvider>,
    )

    expect(html).toContain('What is driving revenue change?')
    expect(html).toContain('Sản phẩm tăng mạnh')
    expect(html).toContain('Sản phẩm đang giảm')
    expect(html).toContain('Largest revenue increases')
    expect(html).toContain('Largest revenue decreases')
    expect(html).toContain('By month')
    expect(html).toContain('By year')
    expect(html).toContain('Order count')
    expect(html).toContain('Units sold')
    expect(html).toContain('Up by 30')
    expect(html).toContain('Down by 10')
    expect(html).toContain('100% of the total revenue decrease')
  })
})
