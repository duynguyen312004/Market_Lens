import {
  translate,
  type Language,
} from '../i18n/LanguageContext'

export function getAuthErrorMessage(
  error: unknown,
  language: Language = 'en',
) {
  if (!(error instanceof Error)) {
    return translate(language, 'auth.errorGeneric')
  }

  const message = error.message.toLowerCase()

  if (message.includes('supabase is not configured')) {
    return translate(language, 'auth.configMissing')
  }

  if (message.includes('invalid login credentials')) {
    return translate(language, 'auth.errorInvalidCredentials')
  }

  if (message.includes('email not confirmed')) {
    return translate(language, 'auth.errorEmailUnconfirmed')
  }

  if (message.includes('user already registered')) {
    return translate(language, 'auth.errorAlreadyRegistered')
  }

  if (message.includes('password should be')) {
    return translate(language, 'auth.errorWeakPassword')
  }

  if (message.includes('rate limit')) {
    return translate(language, 'auth.errorRateLimit')
  }

  if (message.includes('network') || message.includes('fetch')) {
    return translate(language, 'auth.errorNetwork')
  }

  if (message.includes('same password')) {
    return translate(language, 'auth.errorSamePassword')
  }

  if (
    message.includes('current password') ||
    message.includes('reauthentication')
  ) {
    return translate(language, 'auth.errorCurrentPassword')
  }

  if (message.includes('session') || message.includes('expired')) {
    return translate(language, 'auth.errorExpired')
  }

  return language === 'en' ? error.message : translate(language, 'auth.errorGeneric')
}
