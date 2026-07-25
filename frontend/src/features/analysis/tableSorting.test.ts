import { describe, expect, it } from 'vitest'

import {
  nextSortState,
  sortRows,
  type SortState,
} from './tableSorting'

type Row = {
  name: string
  revenue: number
}

describe('tableSorting', () => {
  const rows: Row[] = [
    { name: 'Bình', revenue: 300 },
    { name: 'An', revenue: 100 },
    { name: 'Chi', revenue: 300 },
  ]

  it('sorts Vietnamese names alphabetically', () => {
    const result = sortRows(
      rows,
      { key: 'name', direction: 'asc' },
      (row, key) => row[key],
      'vi',
    )

    expect(result.map((row) => row.name)).toEqual([
      'An',
      'Bình',
      'Chi',
    ])
  })

  it('sorts numeric values descending and keeps ties stable', () => {
    const result = sortRows(
      rows,
      { key: 'revenue', direction: 'desc' },
      (row, key) => row[key],
      'vi',
    )

    expect(result.map((row) => row.name)).toEqual([
      'Bình',
      'Chi',
      'An',
    ])
  })

  it('uses a column default direction, then toggles it', () => {
    const current: SortState<'name' | 'revenue'> = {
      key: 'revenue',
      direction: 'desc',
    }

    expect(nextSortState(current, 'name', 'asc')).toEqual({
      key: 'name',
      direction: 'asc',
    })
    expect(nextSortState(current, 'revenue', 'desc')).toEqual({
      key: 'revenue',
      direction: 'asc',
    })
  })
})
