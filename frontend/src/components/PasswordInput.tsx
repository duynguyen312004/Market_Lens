import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react'
import { forwardRef, useState, type ComponentPropsWithoutRef } from 'react'

import { useLanguage } from '../i18n/LanguageContext'

type PasswordInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'>

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, ...props }, ref) {
    const [isVisible, setIsVisible] = useState(false)
    const { t } = useLanguage()

    return (
      <div className="relative mt-2">
        <input
          {...props}
          className={`${className ?? ''} mt-0 pr-12`}
          ref={ref}
          type={isVisible ? 'text' : 'password'}
        />
        <button
          aria-label={
            isVisible ? t('auth.hidePassword') : t('auth.showPassword')
          }
          className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          onClick={() => setIsVisible((current) => !current)}
          type="button"
        >
          {isVisible ? (
            <EyeSlashIcon aria-hidden="true" size={20} />
          ) : (
            <EyeIcon aria-hidden="true" size={20} />
          )}
        </button>
      </div>
    )
  },
)
