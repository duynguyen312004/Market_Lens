import {
  ChartBarIcon,
  ShoppingBagOpenIcon,
} from '@phosphor-icons/react'

import type {
  AbcClass,
  DiscountAnalysis,
  ProductIntelligence,
} from '../../api/analysesApi'
import { getAssociationLiftTone } from '../../features/analysis/dsCorePresentation'
import { useLanguage } from '../../i18n/LanguageContext'
import {
  formatInteger,
  formatPercent,
  formatVnd,
} from '../../utils/formatters'

const ABC_CLASSES: AbcClass[] = ['A', 'B', 'C']
const ABC_STYLES: Record<AbcClass, string> = {
  A: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  B: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  C: 'border-slate-200 bg-slate-50 text-slate-700',
}

export function ProductIntelligenceSection({
  discount,
  intelligence,
}: {
  discount: DiscountAnalysis
  intelligence: ProductIntelligence
}) {
  const { language, t } = useLanguage()

  return (
    <section className="mt-8" aria-labelledby="product-intelligence-heading">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
        {t('productIntelligence.eyebrow')}
      </p>
      <h2
        className="mt-1 text-xl font-black tracking-tight text-slate-900"
        id="product-intelligence-heading"
      >
        {t('productIntelligence.title')}
      </h2>
      <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
        {t('productIntelligence.desc')}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {ABC_CLASSES.map((abcClass) => {
          const item = intelligence.abc.classes[abcClass]
          return (
            <article
              className={`rounded-2xl border px-5 py-4 ${ABC_STYLES[abcClass]}`}
              key={abcClass}
            >
              <p className="text-xs font-black uppercase tracking-wider">
                {t('abc.class', { value: abcClass })}
              </p>
              <p className="mt-2 text-2xl font-black">
                {formatPercent(
                  item.revenue_share_percent,
                  1,
                  false,
                  language,
                )}
                %
              </p>
              <p className="mt-1 text-xs font-semibold opacity-80">
                {t('abc.products', {
                  count: formatInteger(item.product_count, language),
                })}
                {' · '}
                {formatVnd(item.revenue, language)}
              </p>
            </article>
          )
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
        <AbcProductTable intelligence={intelligence} />
        <ProductAssociationTable intelligence={intelligence} />
      </div>

      <DiscountSection discount={discount} />

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {t('productIntelligence.methodNote')}
      </p>
    </section>
  )
}

function AbcProductTable({
  intelligence,
}: {
  intelligence: ProductIntelligence
}) {
  const { language, t } = useLanguage()
  return (
    <section className="data-panel min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <SectionTitle
        description={t('abc.desc')}
        title={t('abc.title')}
      />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[42rem] text-left text-xs">
          <thead className="border-b border-slate-100 font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="pb-3 pr-3">{t('common.product')}</th>
              <th className="pb-3 pr-3 text-center">{t('abc.group')}</th>
              <th className="pb-3 pr-3 text-right">
                {t('common.revenue')}
              </th>
              <th className="pb-3 pr-3 text-right">
                {t('common.revenueShare')}
              </th>
              <th className="pb-3 text-right">{t('abc.cumulative')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {intelligence.abc.representative_products.map((product) => (
              <tr key={product.product_id}>
                <td className="py-3 pr-3">
                  <p className="font-extrabold text-slate-900">
                    {product.product_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {product.product_id}
                  </p>
                </td>
                <td className="py-3 pr-3 text-center">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 font-black ${ABC_STYLES[product.abc_class]}`}
                  >
                    {product.abc_class}
                  </span>
                </td>
                <td className="py-3 pr-3 text-right font-black text-slate-900">
                  {formatVnd(product.revenue, language)}
                </td>
                <td className="py-3 pr-3 text-right font-bold text-slate-600">
                  {formatPercent(
                    product.revenue_share_percent,
                    1,
                    false,
                    language,
                  )}
                  %
                </td>
                <td className="py-3 text-right font-bold text-indigo-700">
                  {formatPercent(
                    product.cumulative_revenue_share_percent,
                    1,
                    false,
                    language,
                  )}
                  %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ProductAssociationTable({
  intelligence,
}: {
  intelligence: ProductIntelligence
}) {
  const { language, t } = useLanguage()
  const associations = intelligence.associations
  return (
    <section className="data-panel min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <SectionTitle
        description={t('pairs.desc')}
        title={t('pairs.title')}
      />
      {associations.available ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[42rem] text-left text-xs">
            <thead className="border-b border-slate-100 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-3 pr-3">{t('pairs.rule')}</th>
                <th className="pb-3 pr-3 text-right">
                  {t('pairs.support')}
                </th>
                <th className="pb-3 pr-3 text-right">
                  {t('pairs.confidence')}
                </th>
                <th className="pb-3 text-right">{t('pairs.lift')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {associations.rules.map((rule) => (
                <tr
                  key={`${rule.source_product_id}:${rule.target_product_id}`}
                >
                  <td className="py-3 pr-3">
                    <p className="font-extrabold text-slate-900">
                      {rule.source_product_name}
                      <span className="mx-1.5 text-indigo-400">→</span>
                      {rule.target_product_name}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-400">
                      {t('pairs.ordersTogether', {
                        count: formatInteger(
                          rule.pair_order_count,
                          language,
                        ),
                      })}
                    </p>
                  </td>
                  <td className="py-3 pr-3 text-right font-semibold text-slate-600">
                    {formatPercent(
                      rule.support_percent,
                      2,
                      false,
                      language,
                    )}
                    %
                  </td>
                  <td className="py-3 pr-3 text-right font-semibold text-slate-600">
                    {formatPercent(
                      rule.confidence_percent,
                      1,
                      false,
                      language,
                    )}
                    %
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={[
                        'inline-flex rounded-full px-2.5 py-1 font-black',
                        getAssociationLiftTone(rule.lift) === 'positive'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600',
                      ].join(' ')}
                    >
                      {t('pairs.strengthValue', {
                        value: formatPercent(
                          rule.lift,
                          2,
                          false,
                          language,
                        ),
                      })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-xs font-semibold text-slate-500">
          {associations.reason === 'INSUFFICIENT_ASSOCIATION_SUPPORT'
            ? t('pairs.insufficient')
            : t('pairs.empty')}
        </p>
      )}
      {associations.skipped_oversized_order_count > 0 && (
        <p className="mt-3 text-xs leading-5 text-amber-700">
          {t('pairs.skipped', {
            count: formatInteger(
              associations.skipped_oversized_order_count,
              language,
            ),
            maximum: associations.max_products_per_basket,
          })}
        </p>
      )}
      {associations.available && (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
          {t('pairs.metricsHelp')}
        </p>
      )}
    </section>
  )
}

function DiscountSection({ discount }: { discount: DiscountAnalysis }) {
  const { language, t } = useLanguage()
  return (
    <div className="mt-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <SmallMetric
          label={t('discount.amount')}
          value={formatVnd(discount.discount_amount, language)}
        />
        <SmallMetric
          label={t('discount.rate')}
          value={`${formatPercent(
            discount.discount_rate_percent,
            1,
            false,
            language,
          )}%`}
        />
        <SmallMetric
          label={t('discount.orderRate')}
          value={`${formatPercent(
            discount.discounted_order_rate_percent,
            1,
            false,
            language,
          )}%`}
        />
      </div>

      {!discount.available ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-xs font-semibold text-slate-500">
          {t('discount.empty')}
        </p>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <DiscountTable
            rows={discount.by_product.map((item) => ({
              id: item.product_id,
              label: item.product_name,
              amount: item.discount_amount,
              rate: item.discount_rate_percent,
              orders: item.order_count,
            }))}
            title={t('discount.byProduct')}
          />
          <DiscountTable
            rows={discount.by_category.map((item) => ({
              id: item.category,
              label: item.category,
              amount: item.discount_amount,
              rate: item.discount_rate_percent,
              orders: item.order_count,
            }))}
            title={t('discount.byCategory')}
          />
        </div>
      )}
    </div>
  )
}

function DiscountTable({
  rows,
  title,
}: {
  rows: Array<{
    id: string
    label: string
    amount: number
    rate: number
    orders: number
  }>
  title: string
}) {
  const { language, t } = useLanguage()
  return (
    <section className="data-panel min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <h3 className="font-black text-slate-900">{title}</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[30rem] text-left text-xs">
          <thead className="border-b border-slate-100 font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="pb-3 pr-3">{t('discount.dimension')}</th>
              <th className="pb-3 pr-3 text-right">
                {t('discount.amount')}
              </th>
              <th className="pb-3 pr-3 text-right">{t('discount.rate')}</th>
              <th className="pb-3 text-right">{t('common.orders')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-3 pr-3 font-extrabold text-slate-900">
                  {row.label}
                </td>
                <td className="py-3 pr-3 text-right font-black text-slate-900">
                  {formatVnd(row.amount, language)}
                </td>
                <td className="py-3 pr-3 text-right font-bold text-indigo-700">
                  {formatPercent(row.rate, 1, false, language)}%
                </td>
                <td className="py-3 text-right font-semibold text-slate-600">
                  {formatInteger(row.orders, language)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function SectionTitle({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
        <ChartBarIcon aria-hidden="true" size={20} weight="duotone" />
      </span>
      <div>
        <h3 className="font-black text-slate-900">{title}</h3>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  )
}

function SmallMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
      <div className="flex items-center gap-2 text-slate-500">
        <ShoppingBagOpenIcon aria-hidden="true" size={17} weight="duotone" />
        <p className="text-xs font-bold">{label}</p>
      </div>
      <p className="mt-2 text-xl font-black text-slate-900">{value}</p>
    </article>
  )
}
