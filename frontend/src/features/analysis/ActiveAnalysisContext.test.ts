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
  it('isolates the session selection by authenticated user', () => {
    vi.stubGlobal('sessionStorage', createStorage())

    storeSelectedAnalysisId('user-one', 'analysis-one')
    storeSelectedAnalysisId('user-two', 'analysis-two')

    expect(readStoredAnalysisId('user-one')).toBe('analysis-one')
    expect(readStoredAnalysisId('user-two')).toBe('analysis-two')
    expect(getAnalysisStorageKey('user-one')).toBe(
      'marketlens:activeAnalysisId:user-one',
    )
  })

  it('removes only the current user selection', () => {
    vi.stubGlobal('sessionStorage', createStorage())
    storeSelectedAnalysisId('user-one', 'analysis-one')
    storeSelectedAnalysisId('user-two', 'analysis-two')

    storeSelectedAnalysisId('user-one', null)

    expect(readStoredAnalysisId('user-one')).toBeNull()
    expect(readStoredAnalysisId('user-two')).toBe('analysis-two')
  })

  it('does not carry a selection into a new browser session', () => {
    vi.stubGlobal('sessionStorage', createStorage())
    storeSelectedAnalysisId('user-one', 'analysis-one')
    expect(readStoredAnalysisId('user-one')).toBe('analysis-one')

    vi.stubGlobal('sessionStorage', createStorage())

    expect(readStoredAnalysisId('user-one')).toBeNull()
  })
})
