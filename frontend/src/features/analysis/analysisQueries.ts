import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

import {
  getAnalysis,
  type AnalysisDetail,
} from '../../api/analysesApi'
import { parseApiError, type ParsedApiError } from '../../api/apiErrors'
import { useAuth } from '../../auth/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import { useActiveAnalysis } from './ActiveAnalysisContext'

export const analysisKeys = {
  all: (userId: string) => ['users', userId, 'analyses'] as const,
  list: (userId: string, limit = 20, offset = 0) =>
    ['users', userId, 'analyses', 'list', limit, offset] as const,
  detail: (userId: string, analysisId: string) =>
    ['users', userId, 'analyses', 'detail', analysisId] as const,
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
  isDetailPending: boolean
  activeIsMissing: boolean
}

export function deriveAnalysisViewState({
  hasActiveId,
  hasAnalysis,
  hasError,
  isDetailPending,
  activeIsMissing,
}: AnalysisViewStateInput) {
  const isEmpty = !hasActiveId || activeIsMissing

  return {
    isEmpty,
    isLoading:
      hasActiveId &&
      !isEmpty &&
      !hasAnalysis &&
      !hasError &&
      isDetailPending,
  }
}

export function useCurrentAnalysis(): CurrentAnalysisState {
  const { language } = useLanguage()
  const { user } = useAuth()
  const {
    activeAnalysisId,
    selectAnalysis,
  } = useActiveAnalysis()
  const userId = user?.id ?? 'signed-out'

  const detailQuery = useQuery({
    queryKey: analysisKeys.detail(
      userId,
      activeAnalysisId ?? 'unselected',
    ),
    queryFn: () => getAnalysis(activeAnalysisId as string),
    enabled: Boolean(user && activeAnalysisId),
  })

  const detailError = detailQuery.error
    ? parseApiError(detailQuery.error, language)
    : null
  const activeIsMissing =
    Boolean(activeAnalysisId) &&
    detailError?.code === 'ANALYSIS_NOT_FOUND'

  useEffect(() => {
    if (activeIsMissing) selectAnalysis(null)
  }, [activeIsMissing, selectAnalysis])

  const analysis = detailQuery.data ?? null
  const effectiveDetailError =
    detailError && !activeIsMissing ? detailError : null
  const viewState = deriveAnalysisViewState({
    hasActiveId: Boolean(activeAnalysisId),
    hasAnalysis: Boolean(analysis),
    hasError: Boolean(effectiveDetailError),
    isDetailPending: detailQuery.isPending,
    activeIsMissing,
  })

  return {
    analysis,
    error: effectiveDetailError,
    ...viewState,
    retry: () => {
      if (activeAnalysisId) void detailQuery.refetch()
    },
  }
}
