import type { KeyboardEvent } from 'react'

export type AnalyticsTabItem<T extends string> = {
  id: T
  label: string
}

export function AnalyticsTabs<T extends string>({
  activeId,
  ariaLabel,
  idPrefix,
  items,
  onChange,
}: {
  activeId: T
  ariaLabel: string
  idPrefix: string
  items: Array<AnalyticsTabItem<T>>
  onChange: (id: T) => void
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
    ) {
      return
    }

    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      ),
    )
    const currentIndex = tabs.indexOf(
      document.activeElement as HTMLButtonElement,
    )
    if (currentIndex < 0) return

    event.preventDefault()
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : event.key === 'ArrowRight'
            ? (currentIndex + 1) % tabs.length
            : (currentIndex - 1 + tabs.length) % tabs.length

    tabs[nextIndex]?.focus()
    tabs[nextIndex]?.click()
  }

  return (
    <div
      aria-label={ariaLabel}
      className="mt-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1"
      onKeyDown={handleKeyDown}
      role="tablist"
    >
      {items.map((item) => (
        <button
          aria-controls={`${idPrefix}-panel-${item.id}`}
          aria-selected={activeId === item.id}
          className={[
            'shrink-0 whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-extrabold transition active:scale-[0.98]',
            activeId === item.id
              ? 'bg-[var(--primary)] text-white'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
          ].join(' ')}
          id={`${idPrefix}-tab-${item.id}`}
          key={item.id}
          onClick={() => onChange(item.id)}
          role="tab"
          tabIndex={activeId === item.id ? 0 : -1}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
