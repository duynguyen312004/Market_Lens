import {
  ArrowRightIcon,
  ChartLineUpIcon,
  CloudArrowUpIcon,
  CurrencyCircleDollarIcon,
  FileTextIcon,
  PackageIcon,
  ShoppingBagOpenIcon,
  TrendUpIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

import { AnalysisHeader } from '../components/analytics/AnalysisHeader'
import {
  AnalysisEmptyState,
  AnalysisErrorState,
  AnalysisLoadingState,
} from '../components/analytics/AnalysisStates'
import {
  CustomerSegmentChart,
  RevenueLineChart,
} from '../components/analytics/Charts'
import { MetricCard } from '../components/analytics/MetricCard'
import { useCurrentAnalysis } from '../features/analysis/analysisQueries'
import { formatAnalysisWarning } from '../features/analysis/presentation'
import {
  formatInteger,
  formatPercent,
  formatVnd,
} from '../utils/formatters'

export function DashboardPage() {
  const { analysis, error, isEmpty, isLoading, retry } = useCurrentAnalysis()

  if (isLoading) return <AnalysisLoadingState />
  if (error) return <AnalysisErrorState error={error} onRetry={retry} />
  if (isEmpty || !analysis) return <AnalysisEmptyState />

  const growth = analysis.summary.growth_rate_percent
  const growthChange =
    growth === null
      ? {
          label: 'Chưa đủ dữ liệu so sánh',
          tone: 'neutral' as const,
        }
      : {
          label: `${formatPercent(growth, 1, true)}% so với 7 ngày trước`,
          tone:
            growth > 0
              ? ('positive' as const)
              : growth < 0
                ? ('negative' as const)
                : ('neutral' as const),
        }

  return (
    <main className="px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <AnalysisHeader
          analysis={analysis}
          description="Theo dõi các chỉ số quan trọng nhất từ file bán hàng đang được chọn."
          title="Tổng quan kinh doanh"
        />

        {analysis.warnings.length > 0 && (
          <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--primary-soft)] px-4 py-3 text-sm leading-6 text-[var(--text-muted)]">
            {analysis.warnings.map(formatAnalysisWarning).join(' ')}
          </div>
        )}

        <section
          aria-label="Chỉ số kinh doanh chính"
          className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <MetricCard
            change={growthChange}
            icon={CurrencyCircleDollarIcon}
            label="Tổng doanh thu"
            value={formatVnd(analysis.summary.total_revenue)}
          />
          <MetricCard
            helper="Đếm theo mã đơn, không đếm theo số dòng."
            icon={ShoppingBagOpenIcon}
            label="Tổng đơn hàng"
            value={formatInteger(analysis.summary.total_orders)}
          />
          <MetricCard
            icon={UsersThreeIcon}
            label="Tổng khách hàng"
            value={formatInteger(analysis.summary.total_customers)}
          />
          <MetricCard
            helper="Tổng quantity của các đơn completed."
            icon={PackageIcon}
            label="Sản phẩm đã bán"
            value={formatInteger(analysis.summary.total_quantity_sold)}
          />
        </section>

        <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
                Doanh thu theo thời gian
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Các ngày không có doanh thu được hiển thị bằng 0.
              </p>
            </div>
            <Link
              className="inline-flex w-fit items-center gap-2 whitespace-nowrap text-sm font-extrabold text-[var(--primary)] hover:underline"
              to="/sales"
            >
              Phân tích chi tiết
              <ArrowRightIcon aria-hidden="true" size={16} weight="bold" />
            </Link>
          </div>
          <div className="mt-5">
            <RevenueLineChart data={analysis.revenue_by_date} />
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
          <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
                  Top sản phẩm theo doanh thu
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Xếp hạng từ các đơn completed.
                </p>
              </div>
              <ChartLineUpIcon
                aria-hidden="true"
                className="shrink-0 text-[var(--primary)]"
                size={25}
                weight="duotone"
              />
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="text-[var(--text-muted)]">
                  <tr>
                    <th className="pb-3 pr-4 font-bold">Sản phẩm</th>
                    <th className="pb-3 pr-4 text-right font-bold">Số lượng</th>
                    <th className="pb-3 text-right font-bold">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.sales.top_products_by_revenue.map(
                    (product, index) => (
                      <tr
                        className="border-t border-[var(--border)]"
                        key={product.product_id}
                      >
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--surface-subtle)] text-xs font-extrabold text-[var(--primary)]">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-extrabold text-[var(--text-primary)]">
                                {product.product_name}
                              </p>
                              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                {product.category}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 pr-4 text-right font-bold text-[var(--text-muted)]">
                          {formatInteger(product.quantity)}
                        </td>
                        <td className="py-3.5 text-right font-extrabold text-[var(--text-primary)]">
                          {formatVnd(product.revenue)}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
                Phân loại khách hàng
              </h2>
              <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                Ba nhóm không trùng nhau, tổng luôn bằng tổng khách hàng.
              </p>
            </div>
            <div className="mt-3">
              <CustomerSegmentChart segments={analysis.customers.segments} />
            </div>
            <p className="mt-2 rounded-xl bg-[var(--surface-subtle)] px-4 py-3 text-xs leading-5 text-[var(--text-muted)]">
              “Khách một đơn” chỉ có nghĩa là khách có đúng một đơn trong kỳ dữ
              liệu, không khẳng định đây là lần mua đầu tiên.
            </p>
          </section>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
              Top khách hàng theo doanh thu
            </h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="text-[var(--text-muted)]">
                  <tr>
                    <th className="pb-3 pr-4 font-bold">Khách hàng</th>
                    <th className="pb-3 pr-4 text-right font-bold">Số đơn</th>
                    <th className="pb-3 pr-4 text-right font-bold">Số lượng</th>
                    <th className="pb-3 text-right font-bold">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.customers.top_customers.map((customer) => (
                    <tr
                      className="border-t border-[var(--border)]"
                      key={customer.customer_id}
                    >
                      <td className="py-3.5 pr-4 font-extrabold text-[var(--text-primary)]">
                        {customer.customer_name}
                      </td>
                      <td className="py-3.5 pr-4 text-right text-[var(--text-muted)]">
                        {formatInteger(customer.order_count)}
                      </td>
                      <td className="py-3.5 pr-4 text-right text-[var(--text-muted)]">
                        {formatInteger(customer.quantity)}
                      </td>
                      <td className="py-3.5 text-right font-extrabold text-[var(--text-primary)]">
                        {formatVnd(customer.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="rounded-2xl bg-[#102b61] p-5 text-white sm:p-6">
            <h2 className="text-lg font-extrabold">Thao tác nhanh</h2>
            <div className="mt-5 space-y-3">
              <QuickAction
                icon={CloudArrowUpIcon}
                label="Upload dữ liệu mới"
                path="/upload"
              />
              <QuickAction
                icon={TrendUpIcon}
                label="Xem dự báo"
                path="/forecast"
              />
              <QuickAction
                icon={FileTextIcon}
                label="Mở báo cáo"
                path="/report"
              />
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

function QuickAction({
  icon: Icon,
  label,
  path,
}: {
  icon: typeof CloudArrowUpIcon
  label: string
  path: string
}) {
  return (
    <Link
      className="flex items-center justify-between gap-4 rounded-xl bg-white/10 px-4 py-3.5 text-sm font-extrabold text-white transition hover:bg-white/16 active:scale-[0.99]"
      to={path}
    >
      <span className="flex items-center gap-3">
        <Icon aria-hidden="true" size={20} weight="duotone" />
        {label}
      </span>
      <ArrowRightIcon aria-hidden="true" size={16} weight="bold" />
    </Link>
  )
}
