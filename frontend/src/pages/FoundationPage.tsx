import {
  ArrowRightIcon,
  BrainIcon,
  ChartBarIcon,
  ChartLineUpIcon,
  CheckCircleIcon,
  FileCsvIcon,
  FileMagnifyingGlassIcon,
  GlobeIcon,
  ListIcon,
  LockKeyIcon,
  ShieldCheckIcon,
  SparkleIcon,
  TrendUpIcon,
  UsersThreeIcon,
  XIcon,
} from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useLanguage } from '../i18n/LanguageContext'

export function FoundationPage() {
  const { language, setLanguage, t } = useLanguage()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const reduceMotion = useReducedMotion()

  const revealVariants = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.15 },
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
      }

  const workflow = [
    {
      title: t('landing.step1Title'),
      description: t('landing.step1Desc'),
      icon: FileCsvIcon,
    },
    {
      title: t('landing.step2Title'),
      description: t('landing.step2Desc'),
      icon: FileMagnifyingGlassIcon,
    },
    {
      title: t('landing.step3Title'),
      description: t('landing.step3Desc'),
      icon: TrendUpIcon,
    },
  ]

  const securityFeatures = [
    {
      title: t('landing.sec1Title'),
      description: t('landing.sec1Desc'),
      icon: LockKeyIcon,
    },
    {
      title: t('landing.sec2Title'),
      description: t('landing.sec2Desc'),
      icon: ShieldCheckIcon,
    },
    {
      title: t('landing.sec3Title'),
      description: t('landing.sec3Desc'),
      icon: BrainIcon,
    },
    {
      title: t('landing.sec4Title'),
      description: t('landing.sec4Desc'),
      icon: CheckCircleIcon,
    },
  ]
  const audiences = [
    t('landing.audienceShopee'),
    t('landing.audienceTikTok'),
    t('landing.audienceRetail'),
    t('landing.audienceSmallBusiness'),
  ]

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-slate-50 text-slate-900">
      {/* Solid Clear Header (No Backdrop Blur) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-xs">
        <nav
          aria-label={t('common.homeNavigation')}
          className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8"
        >
          <Link
            aria-label={t('common.marketLensHome')}
            className="flex items-center gap-2.5 rounded-lg text-xl font-black tracking-tight text-slate-900"
            to="/"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <ChartLineUpIcon aria-hidden="true" size={22} weight="bold" />
            </span>
            <span>Market<span className="text-indigo-600">Lens</span></span>
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            <a
              className="text-xs font-bold text-slate-700 transition hover:text-indigo-600"
              href="#tinh-nang"
            >
              {t('landing.features')}
            </a>
            <a
              className="text-xs font-bold text-slate-700 transition hover:text-indigo-600"
              href="#cach-hoat-dong"
            >
              {t('landing.howItWorks')}
            </a>
            <a
              className="text-xs font-bold text-slate-700 transition hover:text-indigo-600"
              href="#bao-mat"
            >
              {t('landing.security')}
            </a>
          </div>

          <div className="hidden items-center gap-3.5 lg:flex">
            {/* Language Switcher Button */}
            <button
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs font-black text-indigo-700 hover:bg-slate-200 transition"
              onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
              type="button"
            >
              <GlobeIcon size={15} />
              {language.toUpperCase()}
            </button>

            {/* Solid High-Contrast Sign In Button */}
            <Link
              className="rounded-xl border border-slate-300 bg-white px-4.5 py-2.5 text-xs font-black text-slate-900 shadow-2xs hover:bg-slate-100 hover:text-indigo-600 transition"
              to="/login"
            >
              {t('landing.signIn')}
            </Link>

            {/* Glowing CTA Button */}
            <Link
              className="whitespace-nowrap rounded-xl bg-indigo-600 px-5.5 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 transition active:scale-[0.98]"
              to="/register"
            >
              {t('landing.startFree')}
            </Link>
          </div>

          <button
            aria-controls="mobile-navigation"
            aria-expanded={isMenuOpen}
            aria-label={
              isMenuOpen ? t('landing.closeMenu') : t('landing.openMenu')
            }
            className="grid size-10 place-items-center rounded-xl border border-slate-300 text-slate-900 lg:hidden"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            {isMenuOpen ? (
              <XIcon aria-hidden="true" size={21} weight="bold" />
            ) : (
              <ListIcon aria-hidden="true" size={23} weight="bold" />
            )}
          </button>
        </nav>

        {isMenuOpen && (
          <div
            className="border-t border-slate-200 bg-white px-5 py-5 lg:hidden"
            id="mobile-navigation"
          >
            <div className="mx-auto grid max-w-7xl gap-2 text-xs font-bold text-slate-800">
              <a className="rounded-xl px-3 py-2.5 hover:bg-slate-100" href="#tinh-nang" onClick={() => setIsMenuOpen(false)}>
                {t('landing.features')}
              </a>
              <a className="rounded-xl px-3 py-2.5 hover:bg-slate-100" href="#cach-hoat-dong" onClick={() => setIsMenuOpen(false)}>
                {t('landing.howItWorks')}
              </a>
              <a className="rounded-xl px-3 py-2.5 hover:bg-slate-100" href="#bao-mat" onClick={() => setIsMenuOpen(false)}>
                {t('landing.security')}
              </a>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Link
                  className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-center font-black text-slate-900"
                  onClick={() => setIsMenuOpen(false)}
                  to="/login"
                >
                  {t('landing.signIn')}
                </Link>
                <Link
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-center font-black text-white shadow-md shadow-indigo-600/25"
                  onClick={() => setIsMenuOpen(false)}
                  to="/register"
                >
                  {t('landing.startFree')}
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-16 lg:pb-28 bg-white border-b border-slate-200">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
            <motion.div
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1 text-xs font-black text-indigo-700">
                <SparkleIcon aria-hidden="true" size={16} weight="fill" />
                {t('landing.badge')}
              </div>

              <h1 className="max-w-[13ch] text-4xl font-black leading-[1.06] tracking-tight sm:text-5xl lg:text-[4.15rem] text-slate-950">
                {t('landing.heroTitle1')}{' '}
                <span className="text-indigo-600 block sm:inline">{t('landing.heroTitle2')}</span>
              </h1>

              {/* 100% Solid Dark Crisp Text - Zero Blur */}
              <p className="mt-6 max-w-[50ch] text-base sm:text-lg font-bold leading-relaxed text-slate-800">
                {t('landing.heroSub')}
              </p>

              {/* Prominent High-Contrast Call To Action Buttons */}
              <div className="mt-8 flex flex-col gap-3.5 sm:flex-row">
                <Link
                  className="flex items-center justify-center gap-2.5 whitespace-nowrap rounded-xl bg-indigo-600 px-7 py-4 text-sm font-black text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-[0.98] transition"
                  to="/register"
                >
                  {t('landing.startFree')}
                  <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
                </Link>
                <a
                  className="flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-4 text-sm font-black text-slate-900 shadow-2xs hover:bg-slate-50 hover:text-indigo-600 transition active:scale-[0.98]"
                  href="#cach-hoat-dong"
                >
                  {t('landing.seeHowItWorks')}
                </a>
              </div>
            </motion.div>

            {/* Hero Image Preview - Solid Border & Crisp Shadow */}
            <motion.figure
              animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
              className="relative lg:ml-4"
              initial={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }}
              transition={{
                duration: 0.6,
                delay: 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <img
                alt={t('landing.heroAlt')}
                className="aspect-[3/2] w-full rounded-2xl object-cover border border-slate-300 shadow-xl"
                fetchPriority="high"
                height="1024"
                src="/images/marketlens-hero.webp"
                width="1536"
              />
              <figcaption className="mt-3.5 text-xs font-bold text-slate-700 text-center">
                {t('landing.caption')}
              </figcaption>
            </motion.figure>
          </div>
        </section>

        {/* Target Audience Banner */}
        <section className="border-b border-slate-200 bg-slate-100/80 py-8">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 sm:px-8 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-12">
            <p className="text-xs font-black uppercase tracking-wider text-slate-900">
              {t('landing.tailoredFor')}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {audiences.map((audience) => (
                <div
                  className="flex items-center gap-2.5 text-xs font-black text-slate-800"
                  key={audience}
                >
                  <CheckCircleIcon aria-hidden="true" className="shrink-0 text-emerald-600" size={18} weight="fill" />
                  {audience}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28" id="cach-hoat-dong">
          <motion.div className="mx-auto max-w-7xl" {...revealVariants}>
            <div className="max-w-2xl">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-700">{t('landing.howItWorks')}</span>
              <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                {t('landing.workflowTitle')}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700 font-bold">
                {t('landing.workflowSubtitle')}
              </p>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <motion.img
                alt={t('landing.workflowAlt')}
                className="aspect-[8/5] w-full rounded-2xl border border-slate-300 object-cover shadow-lg"
                height="1024"
                loading="lazy"
                src="/images/marketlens-workflow.webp"
                whileHover={{ scale: 1.01 }}
                width="1536"
              />
              <ol className="grid gap-4">
                {workflow.map(({ description, icon: Icon, title }, idx) => (
                  <motion.li
                    className="data-panel grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-slate-300 bg-white p-5 shadow-xs"
                    key={title}
                    initial={{ opacity: 0, x: 16 }}
                    transition={{ delay: idx * 0.08, duration: 0.4 }}
                    viewport={{ once: true }}
                    whileInView={{ opacity: 1, x: 0 }}
                  >
                    <span className="grid size-11 place-items-center rounded-xl bg-indigo-100 text-indigo-700 font-black">
                      <Icon aria-hidden="true" size={24} weight="bold" />
                    </span>
                    <div>
                      <h3 className="font-black text-slate-950 text-base">{title}</h3>
                      <p className="mt-1 text-xs text-slate-700 font-bold leading-relaxed">
                        {description}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </div>
          </motion.div>
        </section>

        {/* Feature Grid Section */}
        <section className="scroll-mt-24 bg-slate-200/60 px-5 py-20 sm:px-8 lg:py-28" id="tinh-nang">
          <motion.div className="mx-auto max-w-7xl" {...revealVariants}>
            <div className="max-w-2xl">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-700">{t('landing.features')}</span>
              <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                {t('landing.featuresTitle')}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-800 font-bold">
                {t('landing.featuresSubtitle')}
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-12">
              <motion.article
                className="data-panel rounded-2xl bg-indigo-700 p-8 text-white shadow-xl lg:col-span-7"
                whileHover={{ y: -4 }}
              >
                <ChartBarIcon aria-hidden="true" className="text-indigo-200" size={32} weight="bold" />
                <h3 className="mt-10 text-2xl font-black tracking-tight text-white">
                  {t('landing.feat1Title')}
                </h3>
                <p className="mt-2.5 text-xs text-white leading-relaxed font-bold">
                  {t('landing.feat1Desc')}
                </p>
              </motion.article>

              <motion.article
                className="data-panel rounded-2xl border border-slate-300 bg-white p-8 shadow-xs lg:col-span-5"
                whileHover={{ y: -4 }}
              >
                <UsersThreeIcon aria-hidden="true" className="text-indigo-700" size={32} weight="bold" />
                <h3 className="mt-10 text-2xl font-black tracking-tight text-slate-950">
                  {t('landing.feat2Title')}
                </h3>
                <p className="mt-2.5 text-xs text-slate-800 leading-relaxed font-bold">
                  {t('landing.feat2Desc')}
                </p>
              </motion.article>

              <motion.article
                className="data-panel rounded-2xl border border-slate-300 bg-white p-8 shadow-xs lg:col-span-4"
                whileHover={{ y: -4 }}
              >
                <TrendUpIcon aria-hidden="true" className="text-emerald-600" size={32} weight="bold" />
                <h3 className="mt-8 text-xl font-black tracking-tight text-slate-950">
                  {t('landing.feat3Title')}
                </h3>
                <p className="mt-2 text-xs text-slate-800 leading-relaxed font-bold">
                  {t('landing.feat3Desc')}
                </p>
              </motion.article>

              <motion.article
                className="data-panel relative overflow-hidden rounded-2xl lg:col-span-8 shadow-xs"
                whileHover={{ y: -4 }}
              >
                <img
                  alt={t('landing.reportAlt')}
                  className="absolute inset-0 size-full object-cover"
                  height="1024"
                  loading="lazy"
                  src="/images/marketlens-report.webp"
                  width="1536"
                />
                <div className="relative min-h-72 bg-slate-950/90 p-8 text-white">
                  <BrainIcon aria-hidden="true" className="text-indigo-400" size={32} weight="bold" />
                  <h3 className="mt-20 max-w-sm text-2xl font-black tracking-tight text-white">
                    {t('landing.feat4Title')}
                  </h3>
                  <p className="mt-2 max-w-sm text-xs text-slate-100 leading-relaxed font-bold">
                    {t('landing.feat4Desc')}
                  </p>
                </div>
              </motion.article>
            </div>
          </motion.div>
        </section>

        {/* Security Section (4 Cards Grid) */}
        <section className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28" id="bao-mat">
          <motion.div className="mx-auto max-w-7xl" {...revealVariants}>
            <div className="max-w-2xl">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-700">{t('landing.security')}</span>
              <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                {t('landing.secTitle')}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-800 font-bold">
                {t('landing.secDesc')}
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {securityFeatures.map(({ description, icon: Icon, title }) => (
                <motion.article
                  className="data-panel rounded-2xl border border-slate-300 bg-white p-6 shadow-xs"
                  key={title}
                  whileHover={{ y: -4 }}
                >
                  <span className="grid size-11 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
                    <Icon aria-hidden="true" size={24} weight="bold" />
                  </span>
                  <h3 className="mt-5 font-black text-slate-950 text-base">{title}</h3>
                  <p className="mt-1.5 text-xs text-slate-700 leading-relaxed font-bold">
                    {description}
                  </p>
                </motion.article>
              ))}
            </div>
          </motion.div>
        </section>

        {/* CTA Callout Banner Section */}
        <section className="px-5 pb-20 sm:px-8 lg:pb-28">
          <motion.div
            className="mx-auto grid max-w-7xl gap-8 rounded-3xl bg-slate-900 px-8 py-12 text-white shadow-2xl lg:grid-cols-[1fr_auto] lg:items-center lg:px-14 lg:py-16"
            {...revealVariants}
          >
            <div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                {t('landing.ctaTitle')}
              </h2>
              <p className="mt-3 max-w-xl text-xs sm:text-sm text-slate-200 font-bold leading-relaxed">
                {t('landing.ctaDesc')}
              </p>
            </div>
            <Link
              className="flex w-fit items-center gap-2.5 whitespace-nowrap rounded-xl bg-indigo-500 px-7 py-4 text-xs font-black text-white shadow-lg hover:bg-indigo-600 transition active:scale-[0.98]"
              to="/register"
            >
              {t('landing.startFree')}
              <ArrowRightIcon aria-hidden="true" size={16} weight="bold" />
            </Link>
          </motion.div>
        </section>
      </main>

      {/* Multi-Column Rich Footer */}
      <footer className="border-t border-slate-300 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <div className="flex items-center gap-2.5 font-black text-slate-950 text-lg">
              <span className="grid size-8 place-items-center rounded-xl bg-indigo-600 text-white">
                <ChartLineUpIcon aria-hidden="true" size={18} weight="bold" />
              </span>
              MarketLens
            </div>
            <p className="mt-3 max-w-sm text-xs text-slate-700 leading-relaxed font-bold">
              {t('landing.footerDesc')}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-950">{t('landing.product')}</h3>
            <div className="mt-3 grid gap-2 text-xs font-bold text-slate-700">
              <a className="hover:text-indigo-600 transition" href="#tinh-nang">{t('landing.features')}</a>
              <a className="hover:text-indigo-600 transition" href="#cach-hoat-dong">{t('landing.howItWorks')}</a>
              <a className="hover:text-indigo-600 transition" href="#bao-mat">{t('landing.security')}</a>
              <a className="hover:text-indigo-600 transition" download href="/marketlens_ds_demo_365_days.csv">{t('landing.sampleFile')}</a>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-950">{t('landing.account')}</h3>
            <div className="mt-3 grid gap-2 text-xs font-bold text-slate-700">
              <Link className="hover:text-indigo-600 transition" to="/login">{t('landing.signIn')}</Link>
              <Link className="hover:text-indigo-600 transition" to="/register">{t('landing.startFree')}</Link>
              <Link className="hover:text-indigo-600 transition" to="/forgot-password">{t('auth.forgotPasswordLink')}</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 py-6 text-center text-xs font-bold text-slate-700">
          <p>© {new Date().getFullYear()} MarketLens. {t('landing.footerTagline')}</p>
        </div>
      </footer>
    </div>
  )
}
