import {
  ChartBarIcon,
  CurrencyCircleDollarIcon,
  PackageIcon,
  ShoppingBagOpenIcon,
  SquaresFourIcon,
} from '@phosphor-icons/react'

import type { ProductMetric } from '../api/analysesApi'
import { AnalysisHeader } from '../components/analytics/AnalysisHeader'
import {
  AnalysisEmptyState,
  AnalysisErrorState,
  AnalysisLoadingState,
} from '../components/analytics/AnalysisStates'
import {
  CategoryRevenueChart,
  MonthlyRevenueChart,
  ProductRevenueChart,
  RevenueLineChart,
} from '../components/analytics/Charts'
import { MetricCard } from '../components/analytics/MetricCard'
import { useCurrentAnalysis } from '../features/analysis/analysisQueries'
import {
  formatInteger,
  formatPercent,
  formatVnd,
} from '../utils/formatters'

export function SalesAnalyticsPage() {
  const { analysis, error, isEmpty, isLoading, retry } = useCurrentAnalysis()

  if (isLoading) return <AnalysisLoadingState />
  if (error) return <AnalysisErrorState error={error} onRetry={retry} />
  if (isEmpty || !analysis) {
    return <AnalysisEmptyState title="Chưa có dữ liệu bán hàng" />
  }

  const topProduct = analysis.sales.top_products_by_revenue[0]
  const topCategory = analysis.sales.revenue_by_category[0]

  return (
    <main className="px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <AnalysisHeader
          analysis={analysis}
          description="Phân tích doanh thu theo thời gian, sản phẩm và danh mục từ các đơn completed."
          title="Sales Analytics"
        />

        <section
          aria-label="Tóm tắt bán hàng"
          className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <MetricCard
            icon={CurrencyCircleDollarIcon}
            label="Tổng doanh thu"
            value={formatVnd(analysis.summary.total_revenue)}
          />
          <MetricCard
            icon={ShoppingBagOpenIcon}
            label="Tổng đơn hàng"
            value={formatInteger(analysis.summary.total_orders)}
          />
          <MetricCard
            helper={topProduct?.category}
            icon={PackageIcon}
            label="Sản phẩm dẫn đầu"
            value={topProduct?.product_name ?? 'Chưa có'}
          />
          <MetricCard
            helper={
              topCategory
                ? `${formatPercent(topCategory.revenue_share_percent)}% tổng doanh thu`
                : undefined
            }
            icon={SquaresFourIcon}
            label="Danh mục dẫn đầu"
            value={topCategory?.category ?? 'Chưa có'}
          />
        </section>

        <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <SectionHeading
            description="Chuỗi ngày liên tục trong toàn bộ kỳ dữ liệu."
            title="Doanh thu theo ngày"
          />
          <div className="mt-5">
            <RevenueLineChart data={analysis.revenue_by_date} />
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <SectionHeading
              description="So sánh quy mô doanh thu giữa các danh mục."
              title="Doanh thu theo danh mục"
            />
            <div className="mt-4">
              <CategoryRevenueChart
                data={analysis.sales.revenue_by_category}
              />
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <SectionHeading
              description="Năm sản phẩm có doanh thu cao nhất trong kỳ."
              title="Doanh thu theo sản phẩm"
            />
            <div className="mt-4">
              <ProductRevenueChart
                data={analysis.sales.top_products_by_revenue}
              />
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <SectionHeading
            description="Chỉ hiển thị khi file có dữ liệu completed thuộc ít nhất hai tháng."
            title="Doanh thu theo tháng"
          />
          {analysis.sales.revenue_by_month.length >= 2 ? (
            <div className="mt-5">
              <MonthlyRevenueChart
                data={analysis.sales.revenue_by_month}
              />
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)] px-5 py-8 text-center">
              <p className="font-extrabold text-[var(--text-primary)]">
                Kỳ dữ liệu chưa trải qua nhiều tháng
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Upload file có completed orders ở ít nhất hai tháng để xem biểu
                đồ này.
              </p>
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <ProductTable
            description="Xếp hạng theo tổng line revenue."
            products={analysis.sales.top_products_by_revenue}
            title="Top theo doanh thu"
            valueLabel="Doanh thu"
            valueType="revenue"
          />
          <ProductTable
            description="Xếp hạng theo tổng quantity đã bán."
            products={analysis.sales.top_products_by_quantity}
            title="Top theo số lượng"
            valueLabel="Số lượng"
            valueType="quantity"
          />
          <ProductTable
            description="Không đại diện cho tồn kho hoặc sức khỏe hàng hóa."
            products={analysis.sales.lowest_quantity_products}
            title="Lượng bán thấp nhất trong dữ liệu"
            valueLabel="Số lượng"
            valueType="quantity"
          />
        </div>
      </div>
    </main>
  )
}

function SectionHeading({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <div className="flex items-start gap-3">
      <ChartBarIcon
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-[var(--primary)]"
        size={23}
        weight="duotone"
      />
      <div>
        <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
          {description}
        </p>
      </div>
    </div>
  )
}

function ProductTable({
  description,
  products,
  title,
  valueLabel,
  valueType,
}: {
  description: string
  products: ProductMetric[]
  title: string
  valueLabel: string
  valueType: 'revenue' | 'quantity'
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="font-extrabold text-[var(--text-primary)]">{title}</h2>
      <p className="mt-1 min-h-10 text-xs leading-5 text-[var(--text-muted)]">
        {description}
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[20rem] text-left text-sm">
          <thead className="text-[var(--text-muted)]">
            <tr>
              <th className="pb-3 pr-3 font-bold">Sản phẩm</th>
              <th className="pb-3 text-right font-bold">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                className="border-t border-[var(--border)]"
                key={product.product_id}
              >
                <td className="py-3 pr-3">
                  <p className="font-extrabold text-[var(--text-primary)]">
                    {product.product_name}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {formatInteger(product.order_count)} đơn
                  </p>
                </td>
                <td className="py-3 text-right font-extrabold text-[var(--text-primary)]">
                  {valueType === 'revenue'
                    ? formatVnd(product.revenue)
                    : formatInteger(product.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
