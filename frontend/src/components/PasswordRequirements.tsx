import { CheckCircleIcon, CircleIcon } from '@phosphor-icons/react'

import { useLanguage } from '../i18n/LanguageContext'

const requirements = [
  { key: 'auth.passwordLength', test: (password: string) => password.length >= 8 },
  { key: 'auth.passwordUppercase', test: (password: string) => /[A-Z]/.test(password) },
  {
    key: 'auth.passwordLowercase',
    test: (password: string) => /[a-z]/.test(password),
  },
  { key: 'auth.passwordNumber', test: (password: string) => /[0-9]/.test(password) },
  {
    key: 'auth.passwordNoSpaces',
    test: (password: string) => password.length > 0 && /^\S+$/.test(password),
  },
]

export function PasswordRequirements({ password }: { password: string }) {
  const { t } = useLanguage()
  return (
    <ul
      aria-label={t('auth.passwordRequirements')}
      className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3"
    >
      {requirements.map(({ key, test }) => {
        const isMet = test(password)

        return (
          <li
            className={`flex items-center gap-1.5 ${
              isMet ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'
            }`}
            key={key}
          >
            {isMet ? (
              <CheckCircleIcon aria-hidden="true" size={14} weight="fill" />
            ) : (
              <CircleIcon aria-hidden="true" size={14} />
            )}
            {t(key)}
          </li>
        )
      })}
    </ul>
  )
}
