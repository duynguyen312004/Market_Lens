import type { Session, User } from '@supabase/supabase-js'
import { createContext } from 'react'

export type SignUpResult = {
  requiresEmailConfirmation: boolean
}

export type AuthContextValue = {
  configurationError: string | null
  isPasswordRecovery: boolean
  loading: boolean
  session: Session | null
  user: User | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<SignUpResult>
  updateDisplayName: (displayName: string) => Promise<void>
  updatePassword: (
    password: string,
    currentPassword?: string,
  ) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
