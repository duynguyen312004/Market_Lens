import axios, { type InternalAxiosRequestConfig } from 'axios'

import { buildSessionExpiredLoginUrl } from '../auth/authNavigation'
import { supabase } from '../auth/supabase'
import { resolveApiBaseUrl } from './apiConfig'

export const httpClient = axios.create({
  baseURL: resolveApiBaseUrl(
    {
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      VITE_API_ORIGIN: import.meta.env.VITE_API_ORIGIN,
    },
    { production: import.meta.env.PROD },
  ),
  headers: {
    Accept: 'application/json',
  },
  timeout: 10_000,
})

httpClient.interceptors.request.use(async (config) => {
  if (!supabase) return config

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.access_token) {
    config.headers.set('Authorization', `Bearer ${session.access_token}`)
  }

  return config
})

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _marketLensSessionRetry?: boolean
}

let refreshSessionPromise: Promise<string | null> | null = null

async function refreshAccessToken() {
  if (!supabase) return null
  if (!refreshSessionPromise) {
    refreshSessionPromise = supabase.auth
      .refreshSession()
      .then(({ data, error }) =>
        error ? null : (data.session?.access_token ?? null),
      )
      .catch(() => null)
      .finally(() => {
        refreshSessionPromise = null
      })
  }
  return refreshSessionPromise
}

async function redirectToExpiredSessionLogin() {
  if (!supabase || typeof window === 'undefined') return

  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // The redirect still clears protected UI if the remote call is unavailable.
  }

  const loginUrl = buildSessionExpiredLoginUrl(
    window.location.pathname,
    window.location.search,
  )
  if (`${window.location.pathname}${window.location.search}` !== loginUrl) {
    window.location.replace(loginUrl)
  }
}

httpClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (
      !axios.isAxiosError(error) ||
      error.response?.status !== 401 ||
      !error.config ||
      !supabase
    ) {
      throw error
    }

    const config = error.config as RetriableRequestConfig
    if (!config._marketLensSessionRetry) {
      config._marketLensSessionRetry = true
      const accessToken = await refreshAccessToken()
      if (accessToken) {
        config.headers.set('Authorization', `Bearer ${accessToken}`)
        return httpClient.request(config)
      }
    }

    await redirectToExpiredSessionLogin()
    throw error
  },
)
