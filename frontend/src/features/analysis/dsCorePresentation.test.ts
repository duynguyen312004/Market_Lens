import { describe, expect, it } from 'vitest'

import {
  getAssociationLiftTone,
  getRetentionCellTone,
} from './dsCorePresentation'


describe('DS Core presentation rules', () => {
  it('maps retention boundaries deterministically', () => {
    expect(getRetentionCellTone(100)).toBe('strong')
    expect(getRetentionCellTone(75)).toBe('strong')
    expect(getRetentionCellTone(74.99)).toBe('healthy')
    expect(getRetentionCellTone(50)).toBe('healthy')
    expect(getRetentionCellTone(25)).toBe('moderate')
    expect(getRetentionCellTone(0.01)).toBe('weak')
    expect(getRetentionCellTone(0)).toBe('zero')
  })

  it('does not present lift equal to one as a positive association', () => {
    expect(getAssociationLiftTone(1.01)).toBe('positive')
    expect(getAssociationLiftTone(1)).toBe('neutral')
    expect(getAssociationLiftTone(0.8)).toBe('neutral')
  })
})
