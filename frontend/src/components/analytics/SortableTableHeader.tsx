import {
  CaretDownIcon,
  CaretUpDownIcon,
  CaretUpIcon,
} from '@phosphor-icons/react'

import type {
  SortDirection,
  SortState,
} from '../../features/analysis/tableSorting'

export function SortableTableHeader<Key extends string>({
  align = 'left',
  className = '',
  defaultDirection,
  label,
  onSort,
  sortKey,
  sortLabel,
  sortState,
  title,
}: {
  align?: 'left' | 'right'
  className?: string
  defaultDirection: SortDirection
  label: string
  onSort: (key: Key, defaultDirection: SortDirection) => void
  sortKey: Key
  sortLabel: string
  sortState: SortState<Key>
  title?: string
}) {
  const isActive = sortState.key === sortKey
  const Icon = !isActive
    ? CaretUpDownIcon
    : sortState.direction === 'asc'
      ? CaretUpIcon
      : CaretDownIcon

  return (
    <th
      aria-sort={
        isActive
          ? sortState.direction === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
      className={className}
      scope="col"
      title={title}
    >
      <button
        aria-label={sortLabel}
        className={[
          'group inline-flex w-full items-center gap-1.5 rounded-md py-1 transition-colors hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
          align === 'right' ? 'justify-end text-right' : 'justify-start text-left',
        ].join(' ')}
        onClick={() => onSort(sortKey, defaultDirection)}
        type="button"
      >
        <span>{label}</span>
        <Icon
          aria-hidden="true"
          className={
            isActive
              ? 'shrink-0 text-indigo-600'
              : 'shrink-0 text-slate-300 group-hover:text-indigo-500'
          }
          size={13}
          weight="bold"
        />
      </button>
    </th>
  )
}
