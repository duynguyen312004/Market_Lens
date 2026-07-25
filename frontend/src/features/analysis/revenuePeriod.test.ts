import { describe, expect, it } from 'vitest'

import {
  aggregateRevenueByMonth,
  filterRevenueByPeriod,
  getRevenueMonths,
  getRevenueYears,
  shouldShowDailyRevenue,
  type RevenueDatePoint,
} from './revenuePeriod'

const points: RevenueDatePoint[] = [
  { date: '2025-12-31', revenue: 100 },
  { date: '2026-01-01', revenue: 200 },
  { date: '2026-01-02', revenue: 300 },
  { date: '2026-02-01', revenue: 400 },
]

describe('revenue period presentation', () => {
  it('lists available years and months in a stable order', () => {
    expect(getRevenueYears(points)).toEqual(['2026', '2025'])
    expect(getRevenueMonths(points, '2026')).toEqual(['01', '02'])
    expect(getRevenueMonths(points, 'all')).toEqual([])
  })

  it('filters daily revenue by year and month', () => {
    expect(filterRevenueByPeriod(points, '2026', 'all')).toEqual(
      points.slice(1),
    )
    expect(filterRevenueByPeriod(points, '2026', '01')).toEqual(
      points.slice(1, 3),
    )
    expect(filterRevenueByPeriod(points, 'all', 'all')).toEqual(points)
  })

  it('aggregates selected daily points into monthly totals', () => {
    expect(aggregateRevenueByMonth(points)).toEqual([
      { month: '2025-12', revenue: 100 },
      { month: '2026-01', revenue: 500 },
      { month: '2026-02', revenue: 400 },
    ])
  })

  it('uses daily detail for a selected month or a one-month dataset', () => {
    expect(
      shouldShowDailyRevenue('01', [
        { month: '2026-01', revenue: 500 },
        { month: '2026-02', revenue: 400 },
      ]),
    ).toBe(true)
    expect(
      shouldShowDailyRevenue('all', [
        { month: '2026-01', revenue: 500 },
      ]),
    ).toBe(true)
    expect(
      shouldShowDailyRevenue('all', [
        { month: '2026-01', revenue: 500 },
        { month: '2026-02', revenue: 400 },
      ]),
    ).toBe(false)
  })
})
