import {
  ChartLineUpIcon,
  CheckCircleIcon,
  GlobeIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import type { PropsWithChildren, ReactNode } from 'react'
import { Link } from 'react-router'
import { useLanguage } from '../i18n/LanguageContext'

type AuthLayoutProps = PropsWithChildren<{
  description: string
  footer: ReactNode
  title: string
}>

export function AuthLayout({
  children,
  description,
  footer,
  title,
}: AuthLayoutProps) {
  const reduceMotion = useReducedMotion()
  const { language, setLanguage, t } = useLanguage()

  return (
    <main className="grid min-h-[100dvh] bg-[var(--page)] lg:grid-cols-[minmax(0,1.02fr)_minmax(28rem,0.98fr)]">
      {/* Left Split Hero Banner */}
      <section className="relative hidden min-h-[100dvh] overflow-hidden bg-slate-900 text-white lg:flex lg:flex-col justify-between">
        <div className="relative flex h-full min-h-[100dvh] flex-col justify-between px-10 py-9 xl:px-14">
          <Link className="flex w-fit items-center gap-3 font-black text-xl tracking-tight text-white" to="/">
            <span className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/30">
              <ChartLineUpIcon aria-hidden="true" size={22} weight="bold" />
            </span>
            <span>Market<span className="text-indigo-400">Lens</span></span>
          </Link>

          <motion.div
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            className="my-auto max-w-xl py-12"
            initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="mb-3.5 text-xs font-black uppercase tracking-widest text-indigo-400">
              {t('auth.heroTag')}
            </p>
            <h2 className="text-3xl xl:text-4xl font-black leading-tight tracking-tight text-white">
              {t('auth.heroTitle')}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-200 font-medium">
              {t('auth.heroSub')}
            </p>

            <div className="mt-8 space-y-3.5 text-xs font-bold text-slate-100">
              {[
                t('auth.bullet1'),
                t('auth.bullet2'),
                t('auth.bullet3'),
              ].map((item) => (
                <div className="flex items-center gap-3" key={item}>
                  <CheckCircleIcon className="shrink-0 text-emerald-400" size={18} weight="fill" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="flex items-center justify-between text-xs text-slate-300 border-t border-slate-800 pt-6 font-medium">
            <span className="flex items-center gap-2">
              <ShieldCheckIcon size={18} className="text-emerald-400" />
              {t('auth.securityNote')}
            </span>
            <button
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-200 hover:text-white transition font-bold"
              onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
              type="button"
            >
              <GlobeIcon size={14} />
              {language.toUpperCase()}
            </button>
          </div>
        </div>
      </section>

      {/* Right Form Container */}
      <section className="relative flex min-h-[100dvh] min-w-0 items-center justify-center px-5 py-10 sm:px-10 lg:px-12">
        <div className="relative w-full max-w-[28rem]">
          {/* Top Brand Logo for Mobile & Language Switcher */}
          <div className="flex items-center justify-between mb-8">
            <Link className="flex items-center gap-2.5 font-black text-slate-900 text-lg lg:hidden" to="/">
              <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white">
                <ChartLineUpIcon aria-hidden="true" size={20} weight="bold" />
              </span>
              <span>Market<span className="text-indigo-600">Lens</span></span>
            </Link>

            <button
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-black text-indigo-700 bg-slate-100 shadow-2xs hover:bg-slate-200 transition"
              onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
              type="button"
            >
              <GlobeIcon size={14} />
              {language.toUpperCase()}
            </button>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 font-bold">
            {description}
          </p>

          <div className="mt-7">{children}</div>

          <div className="mt-6 text-center text-xs text-slate-600 font-bold">
            {footer}
          </div>
        </div>
      </section>
    </main>
  )
}
