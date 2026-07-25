import type { Session } from '@supabase/supabase-js'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

import { AuthContext, type AuthContextValue } from './authContext'
import { supabase } from './supabase'
import { useLanguage } from '../i18n/LanguageContext'

const missingConfigurationMessage =
  'Supabase is not configured. Add the URL and publishable key to frontend/.env.local.'
const passwordRecoveryStorageKey = 'marketlens:passwordRecovery'

function readPasswordRecoveryState() {
  try {
    return sessionStorage.getItem(passwordRecoveryStorageKey) === 'active'
  } catch {
    return false
  }
}

function writePasswordRecoveryState(active: boolean) {
  try {
    if (active) {
      sessionStorage.setItem(passwordRecoveryStorageKey, 'active')
    } else {
      sessionStorage.removeItem(passwordRecoveryStorageKey)
    }
  } catch {
    // Recovery still works for the current render when storage is unavailable.
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const { t } = useLanguage()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(
    readPasswordRecoveryState,
  )

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let isMounted = true

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return

      if (error) {
        setSession(null)
      } else {
        setSession(data.session)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (isMounted) {
        if (event === 'PASSWORD_RECOVERY') {
          writePasswordRecoveryState(true)
          setIsPasswordRecovery(true)
        } else if (event === 'SIGNED_OUT') {
          writePasswordRecoveryState(false)
          setIsPasswordRecovery(false)
        }
        setSession(nextSession)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error(missingConfigurationMessage)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    setSession(data.session)
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      if (!supabase) throw new Error(missingConfigurationMessage)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      })

      if (error) throw error
      setSession(data.session)

      return {
        requiresEmailConfirmation: data.session === null,
      }
    },
    [],
  )

  const signOut = useCallback(async () => {
    if (!supabase) return

    const { error } = await supabase.auth.signOut()
    if (error) throw error
    writePasswordRecoveryState(false)
    setIsPasswordRecovery(false)
    setSession(null)
  }, [])

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabase) throw new Error(missingConfigurationMessage)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) throw error
  }, [])

  const updateDisplayName = useCallback(async (displayName: string) => {
    if (!supabase) throw new Error(missingConfigurationMessage)

    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: displayName },
    })
    if (error) throw error

    setSession((currentSession) =>
      currentSession
        ? { ...currentSession, user: data.user }
        : currentSession,
    )
  }, [])

  const updatePassword = useCallback(
    async (password: string, currentPassword?: string) => {
      if (!supabase) throw new Error(missingConfigurationMessage)

      const { data, error } = await supabase.auth.updateUser({
        password,
        ...(currentPassword
          ? { current_password: currentPassword }
          : {}),
      })
      if (error) throw error

      setSession((currentSession) =>
        currentSession
          ? { ...currentSession, user: data.user }
          : currentSession,
      )

      if (!currentPassword) {
        writePasswordRecoveryState(false)
        setIsPasswordRecovery(false)
      }
    },
    [],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      configurationError: supabase ? null : t('auth.configMissing'),
      isPasswordRecovery,
      loading,
      session,
      user: session?.user ?? null,
      requestPasswordReset,
      signIn,
      signOut,
      signUp,
      updateDisplayName,
      updatePassword,
    }),
    [
      isPasswordRecovery,
      loading,
      requestPasswordReset,
      session,
      signIn,
      signOut,
      signUp,
      updateDisplayName,
      updatePassword,
      t,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
