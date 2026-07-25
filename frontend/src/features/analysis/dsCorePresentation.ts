export function getRetentionCellTone(retentionPercent: number) {
  if (retentionPercent >= 75) return 'strong' as const
  if (retentionPercent >= 50) return 'healthy' as const
  if (retentionPercent >= 25) return 'moderate' as const
  if (retentionPercent > 0) return 'weak' as const
  return 'zero' as const
}


export function getAssociationLiftTone(lift: number) {
  return lift > 1 ? ('positive' as const) : ('neutral' as const)
}
