import {
  ArrowCounterClockwiseIcon,
  InfoIcon,
  PackageIcon,
  WarningCircleIcon,
  type Icon,
} from '@phosphor-icons/react'
import { useMemo, useState } from 'react'

import type {
  ProductOrderIssueAnalysis,
  ProductOrderIssueMetric,
} from '../../api/analysesApi'
import {
  nextSortState,
  sortRows,
  type SortDirection,
  type SortState,
} from '../../features/analysis/tableSorting'
import { useLanguage } from '../../i18n/LanguageContext'
import {
  formatInteger,
  formatPercent,
  formatVnd,
} from '../../utils/formatters'
import { SortableTableHeader } from './SortableTableHeader'

type IssueSortKey =
  | 'product'
  | 'orders'
  | 'cancelled'
  | 'returned'
  | 'issueRate'
  | 'affectedValue'

export function ProductOrderIssuesSection({
  analysis,
}: {
  analysis: ProductOrderIssueAnalysis
}) {
  const { language, t } = useLanguage()
  const [sortState, setSortState] =
    useState<SortState<IssueSortKey> | null>(null)
  const products = useMemo(
    () =>
      sortState
        ? sortRows(
            analysis.products,
            sortState,
            issueSortValue,
            language,
          )
        : analysis.products,
    [analysis.products, language, sortState],
  )
  const handleSort = (
    key: IssueSortKey,
    defaultDirection: SortDirection,
  ) => {
    setSortState((current) =>
      current
        ? nextSortState(current, key, defaultDirection)
        : { key, direction: defaultDirection },
    )
  }
  const sortLabel = (label: string) =>
    t('common.sortBy', { label })
  return (
    <div
      aria-labelledby="sales-tab-order-issues"
      className="mt-6"
      id="sales-panel-order-issues"
      role="tabpanel"
    >
      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-900">
          {t('orderIssues.title')}
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          {t('orderIssues.desc')}
        </p>
      </div>

      <>
          <div className="mt-4 flex max-w-5xl items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
            <InfoIcon
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-blue-700"
              size={19}
              weight="fill"
            />
            <div className="text-sm leading-6 text-slate-700">
              <p className="font-extrabold text-slate-900">
                {t('orderIssues.howRankedTitle')}
              </p>
              <p className="mt-1">
                {t('orderIssues.howRankedScope', {
                  minimum: formatInteger(
                    analysis.minimum_order_count,
                    language,
                  ),
                })}
              </p>
              <p>{t('orderIssues.howRankedReason')}</p>
            </div>
          </div>

          <section
            aria-label={t('orderIssues.summaryAria')}
            className="mt-5 grid gap-4 sm:grid-cols-3"
          >
            <SummaryMetric
              icon={ArrowCounterClockwiseIcon}
              label={t('orderIssues.affectedOrders')}
              value={formatInteger(
                analysis.affected_order_count,
                language,
              )}
            />
            <SummaryMetric
              helper={t('orderIssues.affectedValueHelp')}
              icon={PackageIcon}
              label={t('orderIssues.affectedValue')}
              value={formatVnd(
                analysis.affected_product_value,
                language,
              )}
            />
            <SummaryMetric
              helper={t('orderIssues.qualifiedProductsHelp', {
                total: formatInteger(
                  analysis.evaluated_product_count,
                  language,
                ),
              })}
              icon={WarningCircleIcon}
              label={t('orderIssues.qualifiedProducts')}
              value={formatInteger(
                analysis.qualified_product_count,
                language,
              )}
            />
          </section>

          {analysis.available ? (
            <section className="data-panel mt-6 min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <div className="border-b border-slate-100 p-5 sm:p-6">
                <h3 className="font-black text-slate-900">
                  {t('orderIssues.tableTitle')}
                </h3>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  {t('orderIssues.tableDesc')}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {t('common.sortHint')}
                </p>
              </div>
              <div className="overflow-x-auto p-5 sm:p-6">
                <table className="w-full min-w-[62rem] text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <SortableTableHeader
                        className="pb-3 pr-4"
                        defaultDirection="asc"
                        label={t('common.product')}
                        onSort={handleSort}
                        sortKey="product"
                        sortLabel={sortLabel(t('common.product'))}
                        sortState={sortState}
                      />
                      <SortableTableHeader
                        align="right"
                        className="pb-3 pr-4 text-right"
                        defaultDirection="desc"
                        label={t('orderIssues.totalOrders')}
                        onSort={handleSort}
                        sortKey="orders"
                        sortLabel={sortLabel(t('orderIssues.totalOrders'))}
                        sortState={sortState}
                      />
                      <SortableTableHeader
                        align="right"
                        className="pb-3 pr-4 text-right"
                        defaultDirection="desc"
                        label={t('orderIssues.cancelled')}
                        onSort={handleSort}
                        sortKey="cancelled"
                        sortLabel={sortLabel(t('orderIssues.cancelled'))}
                        sortState={sortState}
                      />
                      <SortableTableHeader
                        align="right"
                        className="pb-3 pr-4 text-right"
                        defaultDirection="desc"
                        label={t('orderIssues.returned')}
                        onSort={handleSort}
                        sortKey="returned"
                        sortLabel={sortLabel(t('orderIssues.returned'))}
                        sortState={sortState}
                      />
                      <SortableTableHeader
                        align="right"
                        className="pb-3 pr-4 text-right"
                        defaultDirection="desc"
                        label={t('orderIssues.issueRate')}
                        onSort={handleSort}
                        sortKey="issueRate"
                        sortLabel={sortLabel(t('orderIssues.issueRate'))}
                        sortState={sortState}
                      />
                      <SortableTableHeader
                        align="right"
                        className="pb-3 text-right"
                        defaultDirection="desc"
                        label={t('orderIssues.productValue')}
                        onSort={handleSort}
                        sortKey="affectedValue"
                        sortLabel={sortLabel(t('orderIssues.productValue'))}
                        sortState={sortState}
                        title={t('orderIssues.productValueHelp')}
                      />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((product) => (
                      <ProductIssueRow
                        key={product.product_id}
                        product={product}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
              <WarningCircleIcon
                aria-hidden="true"
                className="mx-auto text-slate-500"
                size={28}
                weight="duotone"
              />
              <h3 className="mt-3 font-black text-slate-900">
                {analysis.reason === 'NO_CANCELLED_OR_RETURNED_ORDERS'
                  ? t('orderIssues.noIssues')
                  : t('orderIssues.insufficient')}
              </h3>
              <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-slate-600">
                {analysis.reason === 'NO_CANCELLED_OR_RETURNED_ORDERS'
                  ? t('orderIssues.noIssuesDesc')
                  : t('orderIssues.insufficientDesc', {
                      minimum: formatInteger(
                        analysis.minimum_order_count,
                        language,
                      ),
                    })}
              </p>
            </section>
          )}

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {t('orderIssues.periodNote')}
          </p>
      </>
    </div>
  )
}

function ProductIssueRow({
  product,
}: {
  product: ProductOrderIssueMetric
}) {
  const { language, t } = useLanguage()
  return (
    <tr className="transition hover:bg-slate-50/70">
      <td className="py-3.5 pr-4">
        <p className="font-extrabold text-slate-900">
          {product.product_name}
        </p>
        <p className="mt-0.5 text-xs text-slate-600">
          {product.category}
        </p>
      </td>
      <td className="py-3.5 pr-4 text-right font-bold text-slate-700">
        {formatInteger(product.total_order_count, language)}
      </td>
      <td className="py-3.5 pr-4 text-right">
        <p className="font-bold text-slate-700">
          {formatInteger(product.cancelled_order_count, language)}
        </p>
        <p className="text-xs text-slate-600">
          {formatPercent(
            product.cancellation_rate_percent,
            1,
            false,
            language,
          )}
          %
        </p>
      </td>
      <td className="py-3.5 pr-4 text-right">
        <p className="font-bold text-slate-700">
          {formatInteger(product.returned_order_count, language)}
        </p>
        <p className="text-xs text-slate-600">
          {formatPercent(
            product.return_rate_percent,
            1,
            false,
            language,
          )}
          %
        </p>
      </td>
      <td className="py-3.5 pr-4 text-right">
        <p className="font-black text-amber-700">
          {formatPercent(
            product.issue_rate_percent,
            1,
            false,
            language,
          )}
          %
        </p>
        <p className="text-xs text-slate-600">
          {t('orderIssues.issueCount', {
            count: formatInteger(product.issue_order_count, language),
          })}
        </p>
      </td>
      <td
        className="py-3.5 text-right font-black text-slate-900"
        title={t('orderIssues.productValueHelp')}
      >
        {formatVnd(product.affected_product_value, language)}
      </td>
    </tr>
  )
}

function SummaryMetric({
  helper,
  icon: Icon,
  label,
  value,
}: {
  helper?: string
  icon: Icon
  label: string
  value: string
}) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold leading-5 text-slate-700">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
          <Icon aria-hidden="true" size={20} weight="duotone" />
        </span>
      </div>
      {helper && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-5 text-slate-600">
          {helper}
        </p>
      )}
    </article>
  )
}

function issueSortValue(
  product: ProductOrderIssueMetric,
  key: IssueSortKey,
) {
  switch (key) {
    case 'product':
      return product.product_name
    case 'orders':
      return product.total_order_count
    case 'cancelled':
      return product.cancelled_order_count
    case 'returned':
      return product.returned_order_count
    case 'issueRate':
      return product.issue_rate_percent
    case 'affectedValue':
      return product.affected_product_value
  }
}
