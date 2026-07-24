import type { Icon } from '@phosphor-icons/react'

export function MetricCard({
  change,
  helper,
  icon: Icon,
  label,
  value,
}: {
  change?: {
    label: string
    tone: 'positive' | 'negative' | 'neutral'
  }
  helper?: string
  icon: Icon
  label: string
  value: string
}) {
  const changeClass = {
    positive: 'text-[var(--success)] bg-[var(--success-soft)]',
    negative: 'text-[var(--danger)] bg-[var(--danger-soft)]',
    neutral: 'text-[var(--text-muted)] bg-[var(--surface-subtle)]',
  }

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[var(--text-muted)]">{label}</p>
          <p className="mt-3 text-2xl font-extrabold tracking-[-0.04em] text-[var(--text-primary)]">
            {value}
          </p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <Icon aria-hidden="true" size={23} weight="duotone" />
        </span>
      </div>
      {change && (
        <p
          className={`mt-4 w-fit rounded-lg px-2.5 py-1 text-xs font-extrabold ${changeClass[change.tone]}`}
        >
          {change.label}
        </p>
      )}
      {helper && (
        <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
          {helper}
        </p>
      )}
    </article>
  )
}
