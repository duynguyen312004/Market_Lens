import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

import {
  getAnalysis,
  listAnalyses,
  type AnalysisDetail,
  type AnalysisListItem,
} from '../../api/analysesApi'
import { parseApiError, type ParsedApiError } from '../../api/apiErrors'

export const LAST_ANALYSIS_ID_KEY = 'marketlens:lastAnalysisId'

export const analysisKeys = {
  all: ['analyses'] as const,
  list: (limit = 20, offset = 0) =>
    ['analyses', 'list', limit, offset] as const,
  detail: (analysisId: string) => ['analyses', analysisId] as const,
}

export function readStoredAnalysisId() {
  try {
    return localStorage.getItem(LAST_ANALYSIS_ID_KEY)
  } catch {
    return null
  }
}

export function storeSelectedAnalysisId(analysisId: string | null) {
  try {
    if (analysisId) {
      localStorage.setItem(LAST_ANALYSIS_ID_KEY, analysisId)
    } else {
      localStorage.removeItem(LAST_ANALYSIS_ID_KEY)
    }
  } catch {
    // The app still works when storage is unavailable or blocked.
  }
}

export function findLatestCompletedAnalysis(items: AnalysisListItem[]) {
  return items.find((item) => item.status === 'completed') ?? null
}

export function resolveFallbackAnalysisId(
  staleAnalysisId: string,
  items: AnalysisListItem[],
) {
  const latest = findLatestCompletedAnalysis(items)
  return latest?.id !== staleAnalysisId ? latest?.id ?? null : null
}

type CurrentAnalysisState = {
  analysis: AnalysisDetail | null
  error: ParsedApiError | null
  isEmpty: boolean
  isLoading: boolean
  retry: () => void
}

export function useCurrentAnalysis(): CurrentAnalysisState {
  const [preferredId, setPreferredId] = useState(readStoredAnalysisId)

  const listQuery = useQuery({
    queryKey: analysisKeys.list(),
    queryFn: () => listAnalyses(),
  })

  const listItems = useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data?.items],
  )
  const latestAnalysis = useMemo(
    () => findLatestCompletedAnalysis(listItems),
    [listItems],
  )
  const activeId = preferredId ?? latestAnalysis?.id ?? null

  const detailQuery = useQuery({
    queryKey: analysisKeys.detail(activeId ?? 'pending'),
    queryFn: () => getAnalysis(activeId as string),
    enabled: Boolean(activeId),
  })

  const detailError = detailQuery.error
    ? parseApiError(detailQuery.error)
    : null
  const preferredIsMissing =
    Boolean(preferredId) &&
    detailError?.code === 'ANALYSIS_NOT_FOUND'

  useEffect(() => {
    if (!preferredId && latestAnalysis) {
      setPreferredId(latestAnalysis.id)
      storeSelectedAnalysisId(latestAnalysis.id)
    }
  }, [latestAnalysis, preferredId])

  useEffect(() => {
    if (!preferredIsMissing || listQuery.isPending) return

    const fallbackId = resolveFallbackAnalysisId(
      preferredId as string,
      listItems,
    )
    setPreferredId(fallbackId)
    storeSelectedAnalysisId(fallbackId)
  }, [
    latestAnalysis,
    listItems,
    listQuery.isPending,
    preferredId,
    preferredIsMissing,
  ])

  const analysis = detailQuery.data ?? null
  const listError =
    !preferredId && listQuery.error ? parseApiError(listQuery.error) : null
  const effectiveDetailError =
    detailError && !preferredIsMissing ? detailError : null

  return {
    analysis,
    error: listError ?? effectiveDetailError,
    isEmpty:
      listQuery.isSuccess &&
      !latestAnalysis &&
      !preferredId,
    isLoading:
      !analysis &&
      !listError &&
      !effectiveDetailError &&
      (!activeId || detailQuery.isPending || preferredIsMissing),
    retry: () => {
      void listQuery.refetch()
      if (activeId) void detailQuery.refetch()
    },
  }
}
