export type RevenueDatePoint = {
  date: string
  revenue: number
}

export type RevenueMonthPoint = {
  month: string
  revenue: number
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-\d{2}$/

export function getRevenueYears(points: RevenueDatePoint[]) {
  return Array.from(
    new Set(
      points.flatMap((point) => {
        const match = DATE_PATTERN.exec(point.date)
        return match ? [match[1]] : []
      }),
    ),
  ).sort((left, right) => right.localeCompare(left))
}

export function getRevenueMonths(
  points: RevenueDatePoint[],
  year: string,
) {
  if (year === 'all') return []

  return Array.from(
    new Set(
      points.flatMap((point) => {
        const match = DATE_PATTERN.exec(point.date)
        return match && match[1] === year ? [match[2]] : []
      }),
    ),
  ).sort((left, right) => Number(left) - Number(right))
}

export function filterRevenueByPeriod(
  points: RevenueDatePoint[],
  year: string,
  month: string,
) {
  if (year === 'all') return points

  return points.filter((point) => {
    const match = DATE_PATTERN.exec(point.date)
    if (!match || match[1] !== year) return false
    return month === 'all' || match[2] === month
  })
}

export function aggregateRevenueByMonth(
  points: RevenueDatePoint[],
): RevenueMonthPoint[] {
  const totals = new Map<string, number>()

  for (const point of points) {
    const match = DATE_PATTERN.exec(point.date)
    if (!match) continue
    const month = `${match[1]}-${match[2]}`
    totals.set(month, (totals.get(month) ?? 0) + point.revenue)
  }

  return Array.from(totals, ([month, revenue]) => ({
    month,
    revenue,
  })).sort((left, right) => left.month.localeCompare(right.month))
}

export function shouldShowDailyRevenue(
  month: string,
  monthlyPoints: RevenueMonthPoint[],
) {
  return month !== 'all' || monthlyPoints.length < 2
}
