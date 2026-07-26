/* oxlint-disable react/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

export const ACTIVE_ANALYSIS_ID_KEY = 'marketlens:activeAnalysisId'

type ActiveAnalysisContextValue = {
  activeAnalysisId: string | null
  selectAnalysis: (analysisId: string | null) => void
}

const ActiveAnalysisContext =
  createContext<ActiveAnalysisContextValue | null>(null)

export function getAnalysisStorageKey(userId: string) {
  return `${ACTIVE_ANALYSIS_ID_KEY}:${userId}`
}

export function readStoredAnalysisId(userId: string) {
  try {
    return sessionStorage.getItem(getAnalysisStorageKey(userId))
  } catch {
    return null
  }
}

export function storeSelectedAnalysisId(
  userId: string,
  analysisId: string | null,
) {
  try {
    const storageKey = getAnalysisStorageKey(userId)
    if (analysisId) {
      sessionStorage.setItem(storageKey, analysisId)
    } else {
      sessionStorage.removeItem(storageKey)
    }
  } catch {
    // Selection remains available in memory when storage is blocked.
  }
}

export function ActiveAnalysisProvider({
  children,
  userId,
}: PropsWithChildren<{ userId: string }>) {
  const [activeAnalysisId, setActiveAnalysisId] = useState(() =>
    readStoredAnalysisId(userId),
  )

  useEffect(() => {
    setActiveAnalysisId(readStoredAnalysisId(userId))
  }, [userId])

  const selectAnalysis = useCallback(
    (analysisId: string | null) => {
      setActiveAnalysisId(analysisId)
      storeSelectedAnalysisId(userId, analysisId)
    },
    [userId],
  )

  const value = useMemo(
    () => ({ activeAnalysisId, selectAnalysis }),
    [activeAnalysisId, selectAnalysis],
  )

  return (
    <ActiveAnalysisContext.Provider value={value}>
      {children}
    </ActiveAnalysisContext.Provider>
  )
}

export function useActiveAnalysis() {
  const context = useContext(ActiveAnalysisContext)
  if (!context) {
    throw new Error(
      'useActiveAnalysis must be used within ActiveAnalysisProvider.',
    )
  }
  return context
}
