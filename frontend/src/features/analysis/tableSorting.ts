export type SortDirection = 'asc' | 'desc'

export type SortState<Key extends string> = {
  key: Key
  direction: SortDirection
}

type SortValue = number | string | null | undefined

export function nextSortState<Key extends string>(
  current: SortState<Key>,
  key: Key,
  defaultDirection: SortDirection,
): SortState<Key> {
  if (current.key !== key) {
    return { key, direction: defaultDirection }
  }
  return {
    key,
    direction: current.direction === 'asc' ? 'desc' : 'asc',
  }
}

export function sortRows<Row, Key extends string>(
  rows: readonly Row[],
  state: SortState<Key>,
  valueFor: (row: Row, key: Key) => SortValue,
  locale: string,
) {
  const collator = new Intl.Collator(locale, {
    numeric: true,
    sensitivity: 'base',
  })

  return rows
    .map((row, originalIndex) => ({ originalIndex, row }))
    .sort((left, right) => {
      const leftValue = valueFor(left.row, state.key)
      const rightValue = valueFor(right.row, state.key)
      if (leftValue == null && rightValue == null) {
        return left.originalIndex - right.originalIndex
      }
      if (leftValue == null) return 1
      if (rightValue == null) return -1
      const comparison = compareValues(
        leftValue,
        rightValue,
        collator,
      )
      if (comparison === 0) {
        return left.originalIndex - right.originalIndex
      }
      return state.direction === 'asc' ? comparison : -comparison
    })
    .map(({ row }) => row)
}

function compareValues(
  left: Exclude<SortValue, null | undefined>,
  right: Exclude<SortValue, null | undefined>,
  collator: Intl.Collator,
) {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right
  }
  return collator.compare(String(left), String(right))
}
