import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getAnalysisStorageKey,
  readStoredAnalysisId,
  storeSelectedAnalysisId,
} from './ActiveAnalysisContext'

function createStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => {
      values.delete(key)
    },
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('active analysis storage', () => {
  it('isolates the selected analysis by authenticated user', () => {
    vi.stubGlobal('localStorage', createStorage())

    storeSelectedAnalysisId('user-one', 'analysis-one')
    storeSelectedAnalysisId('user-two', 'analysis-two')

    expect(readStoredAnalysisId('user-one')).toBe('analysis-one')
    expect(readStoredAnalysisId('user-two')).toBe('analysis-two')
    expect(getAnalysisStorageKey('user-one')).toBe(
      'marketlens:lastAnalysisId:user-one',
    )
  })

  it('removes only the current user selection', () => {
    vi.stubGlobal('localStorage', createStorage())
    storeSelectedAnalysisId('user-one', 'analysis-one')
    storeSelectedAnalysisId('user-two', 'analysis-two')

    storeSelectedAnalysisId('user-one', null)

    expect(readStoredAnalysisId('user-one')).toBeNull()
    expect(readStoredAnalysisId('user-two')).toBe('analysis-two')
  })
})
