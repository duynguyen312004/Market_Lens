import type { Icon } from '@phosphor-icons/react'

type Tone = 'positive' | 'negative' | 'neutral'

export type MetricCardProps = {
  label: string
  value: string
  icon: Icon
  featured?: boolean
  change?: {
    label: string
    tone: Tone
  }
  helper?: string
}

export function MetricCard({
  change,
  featured = false,
  helper,
  icon: IconComponent,
  label,
  value,
}: MetricCardProps) {
  return (
    <article
      className={[
        'min-h-36 rounded-xl border p-5',
        featured
          ? 'border-[#1856b8] bg-[#1f64d8] text-white'
          : 'border-[var(--border)] bg-white text-[var(--text-primary)] shadow-[0_1px_2px_rgba(19,33,54,0.04)]',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={[
              'text-[12px] font-semibold',
              featured ? 'text-blue-100' : 'text-[var(--text-muted)]',
            ].join(' ')}
          >
            {label}
          </p>
          <p
            className={[
              'mt-3 text-[1.65rem] font-extrabold tracking-[-0.035em]',
              featured ? 'text-white' : 'text-[var(--text-primary)]',
            ].join(' ')}
          >
            {value}
          </p>
        </div>
        <span
          className={[
            'grid size-8 shrink-0 place-items-center rounded-lg',
            featured
              ? 'bg-white/12 text-white'
              : 'bg-[var(--surface-subtle)] text-[var(--primary)]',
          ].join(' ')}
        >
          <IconComponent aria-hidden="true" size={18} weight="bold" />
        </span>
      </div>

      {(change || helper) && (
        <div
          className={[
            'mt-4 flex flex-wrap items-center gap-2 border-t pt-3 text-xs',
            featured ? 'border-white/15' : 'border-[var(--border)]',
          ].join(' ')}
        >
          {change && (
            <span
              className={[
                'inline-flex items-center rounded-md px-2 py-1 font-bold',
                featured && 'bg-white/12 text-white',
                !featured &&
                change.tone === 'positive' &&
                  'bg-emerald-50 text-emerald-700',
                !featured &&
                change.tone === 'negative' &&
                  'bg-rose-50 text-rose-700',
                !featured &&
                change.tone === 'neutral' &&
                  'bg-slate-100 text-slate-600',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {change.label}
            </span>
          )}

          {helper && (
            <span
              className={[
                'max-w-[200px] truncate font-medium',
                featured ? 'text-blue-100' : 'text-[var(--text-muted)]',
              ].join(' ')}
            >
              {helper}
            </span>
          )}
        </div>
      )}
    </article>
  )
}
