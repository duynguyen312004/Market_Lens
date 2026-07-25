import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

import {
  getAnalysis,
  listAnalyses,
  type AnalysisDetail,
  type AnalysisListItem,
} from '../../api/analysesApi'
import { parseApiError, type ParsedApiError } from '../../api/apiErrors'
import { useLanguage } from '../../i18n/LanguageContext'
import { useActiveAnalysis } from './ActiveAnalysisContext'

export const analysisKeys = {
  all: ['analyses'] as const,
  list: (limit = 20, offset = 0) =>
    ['analyses', 'list', limit, offset] as const,
  detail: (analysisId: string) => ['analyses', analysisId] as const,
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

type AnalysisViewStateInput = {
  hasActiveId: boolean
  hasAnalysis: boolean
  hasError: boolean
  hasLatestAnalysis: boolean
  hasPreferredId: boolean
  isDetailPending: boolean
  isListSuccess: boolean
  preferredIsMissing: boolean
}

export function deriveAnalysisViewState({
  hasActiveId,
  hasAnalysis,
  hasError,
  hasLatestAnalysis,
  hasPreferredId,
  isDetailPending,
  isListSuccess,
  preferredIsMissing,
}: AnalysisViewStateInput) {
  const isEmpty =
    isListSuccess &&
    !hasLatestAnalysis &&
    !hasPreferredId

  return {
    isEmpty,
    isLoading:
      !isEmpty &&
      !hasAnalysis &&
      !hasError &&
      (!hasActiveId || isDetailPending || preferredIsMissing),
  }
}

export function useCurrentAnalysis(): CurrentAnalysisState {
  const { language } = useLanguage()
  const {
    activeAnalysisId: preferredId,
    selectAnalysis,
  } = useActiveAnalysis()

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
    ? parseApiError(detailQuery.error, language)
    : null
  const preferredIsMissing =
    Boolean(preferredId) &&
    detailError?.code === 'ANALYSIS_NOT_FOUND'

  useEffect(() => {
    if (!preferredId && latestAnalysis) {
      selectAnalysis(latestAnalysis.id)
    }
  }, [latestAnalysis, preferredId, selectAnalysis])

  useEffect(() => {
    if (!preferredIsMissing || listQuery.isPending) return

    const fallbackId = resolveFallbackAnalysisId(
      preferredId as string,
      listItems,
    )
    selectAnalysis(fallbackId)
  }, [
    latestAnalysis,
    listItems,
    listQuery.isPending,
    preferredId,
    preferredIsMissing,
    selectAnalysis,
  ])

  const analysis = detailQuery.data ?? null
  const listError =
    !preferredId && listQuery.error
      ? parseApiError(listQuery.error, language)
      : null
  const effectiveDetailError =
    detailError && !preferredIsMissing ? detailError : null
  const effectiveError = listError ?? effectiveDetailError
  const viewState = deriveAnalysisViewState({
    hasActiveId: Boolean(activeId),
    hasAnalysis: Boolean(analysis),
    hasError: Boolean(effectiveError),
    hasLatestAnalysis: Boolean(latestAnalysis),
    hasPreferredId: Boolean(preferredId),
    isDetailPending: detailQuery.isPending,
    isListSuccess: listQuery.isSuccess,
    preferredIsMissing,
  })

  return {
    analysis,
    error: effectiveError,
    ...viewState,
    retry: () => {
      void listQuery.refetch()
      if (activeId) void detailQuery.refetch()
    },
  }
}
