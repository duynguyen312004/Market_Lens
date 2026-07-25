import {
  ChartLineUpIcon,
  CheckCircleIcon,
  FilePdfIcon,
  InfoIcon,
  SparkleIcon,
  SpinnerGapIcon,
  TargetIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import {
  generateAiReport,
  type AnalysisDetail,
  type ReportContent,
  type ReportEvidence,
} from '../api/analysesApi'
import { parseApiError } from '../api/apiErrors'
import { queryClient } from '../app/queryClient'
import { AnalysisHeader } from '../components/analytics/AnalysisHeader'
import {
  AnalysisEmptyState,
  AnalysisErrorState,
  AnalysisLoadingState,
} from '../components/analytics/AnalysisStates'
import { ReportCharts } from '../components/report/ReportCharts'
import {
  analysisKeys,
  useCurrentAnalysis,
} from '../features/analysis/analysisQueries'
import {
  getAnalysisFileLabel,
  getAnalysisSourceNames,
} from '../features/analysis/presentation'
import {
  formatReportEvidence,
  getReportPageTitle,
} from '../features/report/reportPresentation'
import {
  useLanguage,
  type Language,
} from '../i18n/LanguageContext'
import {
  formatDate,
  formatDateTime,
  formatInteger,
} from '../utils/formatters'

export function ReportPage() {
  const { language, t } = useLanguage()
  const { analysis, error, isEmpty, isLoading, retry } =
    useCurrentAnalysis()
  const [generationNotice, setGenerationNotice] = useState<{
    message: string
    tone: 'success' | 'warning' | 'danger'
  } | null>(null)

  const reportMutation = useMutation({
    mutationFn: (analysisId: string) =>
      generateAiReport(analysisId, language),
    onMutate: () => setGenerationNotice(null),
    onSuccess: (result) => {
      queryClient.setQueryData<AnalysisDetail>(
        analysisKeys.detail(result.analysis_id),
        (current) =>
          current
            ? {
                ...current,
                report: result.report,
                reports: {
                  ...current.reports,
                  [result.language]: result.report,
                },
              }
            : current,
      )
      setGenerationNotice(
        result.warning
          ? {
              message: t(
                {
                  AI_DISABLED: 'report.aiDisabled',
                  AI_NOT_CONFIGURED: 'report.aiNotConfigured',
                  AI_PROVIDER_UNSUPPORTED: 'report.aiUnsupported',
                  AI_TIMEOUT: 'report.aiTimeout',
                  AI_INVALID_RESPONSE: 'report.aiInvalid',
                  AI_PROVIDER_ERROR: 'report.aiProviderError',
                  AI_RATE_LIMITED: 'report.aiRateLimited',
                }[result.warning.code] ?? 'api.UNKNOWN_ERROR',
              ),
              tone: 'warning',
            }
          : {
              message: t('report.generatedSaved'),
              tone: 'success',
            },
      )
    },
    onError: (mutationError) => {
      setGenerationNotice({
        message: parseApiError(mutationError, language).message,
        tone: 'danger',
      })
    },
  })

  if (isLoading) return <AnalysisLoadingState />
  if (error) return <AnalysisErrorState error={error} onRetry={retry} />
  if (isEmpty || !analysis) {
    return <AnalysisEmptyState title={t('report.noData')} />
  }

  const report = analysis.reports[language] ?? analysis.report

  return (
    <main className="report-page px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <div className="report-screen-only">
          <AnalysisHeader
            analysis={analysis}
            description={t('report.desc')}
            title={getReportPageTitle(report.source, language)}
          />

          <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="max-w-2xl">
              <h2 className="font-black text-slate-900">
                {t('report.actionTitle')}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {t('report.actionDesc')}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-55"
                disabled={reportMutation.isPending}
                onClick={() => reportMutation.mutate(analysis.id)}
                type="button"
              >
                {reportMutation.isPending ? (
                  <SpinnerGapIcon
                    className="animate-spin"
                    size={18}
                    weight="bold"
                  />
                ) : (
                  <SparkleIcon size={18} weight="fill" />
                )}
                {reportMutation.isPending
                  ? t('report.generating')
                  : report.source === 'ai'
                    ? t('report.regenerateAi')
                    : t('report.regenerate')}
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-black text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-indigo-600"
                onClick={() => window.print()}
                type="button"
              >
                <FilePdfIcon size={19} weight="duotone" />
                {t('report.exportPdf')}
              </button>
            </div>
          </section>

          {generationNotice && (
            <GenerationNotice
              message={generationNotice.message}
              tone={generationNotice.tone}
            />
          )}
        </div>

        <article
          className="mt-7 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md"
          id="business-report"
        >
          <header className="border-b border-[var(--border)] bg-[var(--primary-soft)] p-6 sm:p-9">
            <div className="mb-7 flex items-center justify-between border-b border-indigo-200/70 pb-4">
              <div>
                <p className="text-lg font-black tracking-tight text-indigo-700">
                  MarketLens
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {t('report.documentSubtitle')}
                </p>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('report.confidential')}
              </p>
            </div>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <ReportSource source={report.source} />
                  <span className="rounded-full border border-indigo-200 bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-700">
                    Report {report.report_version}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {report.title}
                </h2>
                <p className="mt-3 text-sm font-medium leading-relaxed text-slate-700 sm:text-base">
                  {report.executive_summary}
                </p>
              </div>
              <dl className="grid shrink-0 gap-3 text-xs sm:min-w-56">
                <div>
                  <dt className="font-semibold text-slate-400">
                    {t('report.generatedFor')}
                  </dt>
                  <dd
                    className="mt-0.5 max-w-72 break-words font-bold text-slate-900"
                    title={getAnalysisSourceNames(analysis)}
                  >
                    {analysis.upload.source_files
                      .map((source) => source.file_name)
                      .join(', ') ||
                      getAnalysisFileLabel(analysis, language)}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-400">
                    {t('report.period')}
                  </dt>
                  <dd className="mt-0.5 font-bold text-slate-900">
                    {formatDate(analysis.period.from, language)} –{' '}
                    {formatDate(analysis.period.to, language)}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-400">
                    {t('report.datasetSize')}
                  </dt>
                  <dd className="mt-0.5 font-bold text-slate-900">
                    {t('report.datasetSizeValue', {
                      rows: formatInteger(analysis.row_count, language),
                      files: formatInteger(
                        analysis.source_file_count,
                        language,
                      ),
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-400">
                    {t('report.generatedAt')}
                  </dt>
                  <dd className="mt-0.5 font-bold text-slate-900">
                    {formatDateTime(report.generated_at, language)}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-400">
                    {t('report.generator')}
                  </dt>
                  <dd className="mt-0.5 font-bold text-slate-900">
                    {report.generator.model ??
                      t('report.generatorRules')}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="report-kpi-grid mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {report.kpi_snapshot.map((evidence) => (
                <div
                  className="report-print-break-avoid rounded-xl border border-[var(--border)] bg-white p-4"
                  key={evidence.metric_key}
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {evidence.label}
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-900">
                    {formatReportEvidence(evidence, language)}
                  </p>
                  {evidence.context && (
                    <p className="mt-1 truncate text-[10px] font-semibold text-slate-500">
                      {evidence.context}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </header>

          <DataQualitySection
            dataQuality={report.data_quality}
            language={language}
          />

          <ReportCharts analysis={analysis} />

          <section className="border-b border-slate-100 p-6 sm:p-9">
            <div className="mb-6 flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <ChartLineUpIcon size={21} weight="duotone" />
              </span>
              <div>
                <h3 className="text-lg font-black tracking-tight text-slate-900">
                  {t('report.analysisSections')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('report.analysisSectionsDesc')}
                </p>
              </div>
            </div>
            <div className="report-print-two-column grid gap-5 xl:grid-cols-2">
              {report.sections.map((section) => (
                <section
                  className="report-print-break-avoid rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
                  key={section.key}
                >
                  <h4 className="font-black text-slate-900">
                    {section.title}
                  </h4>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600">
                    {section.narrative}
                  </p>
                  <EvidenceList
                    evidence={section.evidence}
                    language={language}
                  />
                </section>
              ))}
            </div>
          </section>

          <RiskSection
            language={language}
            risks={report.risk_signals}
          />

          <section className="report-recommendations-section border-b border-slate-100 p-6 sm:p-9">
            <div className="mb-6 flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                <TargetIcon size={21} weight="duotone" />
              </span>
              <div>
                <h3 className="text-lg font-black tracking-tight text-slate-900">
                  {t('report.recommendations')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('report.recommendationsDesc')}
                </p>
              </div>
            </div>
            <div
              className="report-print-two-column report-recommendations-grid grid gap-5 xl:grid-cols-2"
              data-count={report.recommendations.length}
            >
              {report.recommendations.map((recommendation, index) => (
                <article
                  className="report-print-break-avoid rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs"
                  key={`${recommendation.title}-${index}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={[
                        'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider',
                        priorityClassName(recommendation.priority),
                      ].join(' ')}
                    >
                      {t(`report.priority.${recommendation.priority}`)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      #{index + 1}
                    </span>
                  </div>
                  <h4 className="mt-3 text-sm font-black text-slate-900">
                    {recommendation.title}
                  </h4>
                  <div className="mt-3 space-y-3 text-xs leading-relaxed">
                    <div>
                      <p className="font-black uppercase tracking-wider text-slate-400">
                        {t('report.action')}
                      </p>
                      <p className="mt-1 text-slate-700">
                        {recommendation.action}
                      </p>
                    </div>
                    <div>
                      <p className="font-black uppercase tracking-wider text-slate-400">
                        {t('report.successMetric')}
                      </p>
                      <p className="mt-1 text-slate-700">
                        {recommendation.success_metric}
                      </p>
                    </div>
                  </div>
                  <EvidenceList
                    evidence={recommendation.evidence}
                    language={language}
                  />
                </article>
              ))}
            </div>
          </section>

          <footer className="bg-slate-50 p-6 text-xs text-slate-500">
            <div className="flex items-start gap-3">
              <InfoIcon
                className="mt-0.5 shrink-0 text-slate-400"
                size={17}
                weight="fill"
              />
              <p className="leading-relaxed">{report.disclaimer}</p>
            </div>
          </footer>
        </article>
      </div>
    </main>
  )
}

function DataQualitySection({
  dataQuality,
  language,
}: {
  dataQuality: ReportContent['data_quality']
  language: Language
}) {
  const { t } = useLanguage()
  const needsAttention = dataQuality.status === 'attention'
  return (
    <section className="border-b border-slate-100 p-6 sm:p-9">
      <div className="report-print-break-avoid rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {needsAttention ? (
              <WarningCircleIcon
                className="text-amber-600"
                size={22}
                weight="fill"
              />
            ) : (
              <CheckCircleIcon
                className="text-emerald-600"
                size={22}
                weight="fill"
              />
            )}
            <h3 className="font-black text-slate-900">
              {t('report.dataQuality')}
            </h3>
          </div>
          <span
            className={[
              'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider',
              needsAttention
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800',
            ].join(' ')}
          >
            {t(
              needsAttention
                ? 'report.dataQualityAttention'
                : 'report.dataQualityGood',
            )}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          {dataQuality.summary}
        </p>
        {dataQuality.signals.length > 0 && (
          <div className="report-print-two-column mt-4 grid gap-3 lg:grid-cols-2">
            {dataQuality.signals.map((signal) => (
              <div
                className="rounded-xl border border-slate-200 bg-white p-4"
                key={signal.code}
              >
                <p className="text-xs font-semibold leading-relaxed text-slate-700">
                  {signal.message}
                </p>
                <EvidenceList
                  evidence={signal.evidence}
                  language={language}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function RiskSection({
  language,
  risks,
}: {
  language: Language
  risks: ReportContent['risk_signals']
}) {
  const { t } = useLanguage()
  return (
    <section className="report-risk-section border-b border-slate-100 p-6 sm:p-9">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
          <WarningCircleIcon size={21} weight="duotone" />
        </span>
        <div>
          <h3 className="text-lg font-black tracking-tight text-slate-900">
            {t('report.riskSignals')}
          </h3>
          <p className="text-xs text-slate-500">
            {t('report.riskSignalsDesc')}
          </p>
        </div>
      </div>
      {risks.length === 0 ? (
        <div className="report-print-break-avoid rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900">
          {t('report.noRiskSignals')}
        </div>
      ) : (
        <div className="report-print-two-column grid gap-4 xl:grid-cols-2">
          {risks.map((risk) => (
            <article
              className="report-print-break-avoid rounded-xl border border-amber-200 bg-amber-50/60 p-4"
              key={risk.code}
            >
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-black text-slate-900">
                  {risk.title}
                </h4>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">
                  {t(`report.severity.${risk.severity}`)}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-700">
                {risk.description}
              </p>
              <EvidenceList
                evidence={risk.evidence}
                language={language}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function EvidenceList({
  evidence,
  language,
}: {
  evidence: ReportEvidence[]
  language: Language
}) {
  const { t } = useLanguage()
  return (
    <div className="mt-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
        {t('report.evidence')}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {evidence.map((item) => (
          <span
            className="report-evidence-chip inline-flex max-w-full items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-[10px] font-bold text-indigo-900"
            key={item.metric_key}
            title={item.metric_key}
          >
            <span className="report-evidence-label truncate">
              {item.context ? `${item.context} · ` : ''}
              {item.label}
            </span>
            <span className="shrink-0 text-indigo-600">
              {formatReportEvidence(item, language)}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function ReportSource({
  source,
}: {
  source: ReportContent['source']
}) {
  const { t } = useLanguage()
  if (source === 'ai') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-3.5 py-1 text-xs font-extrabold text-white">
        <SparkleIcon size={14} weight="fill" />
        {t('report.badgeAi')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1 text-xs font-extrabold text-slate-700">
      {t('report.badgeRules')}
    </span>
  )
}

function priorityClassName(
  priority: ReportContent['recommendations'][number]['priority'],
) {
  if (priority === 'high') return 'bg-rose-100 text-rose-800'
  if (priority === 'medium') return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-700'
}

function GenerationNotice({
  message,
  tone,
}: {
  message: string
  tone: 'success' | 'warning' | 'danger'
}) {
  return (
    <div
      className={[
        'mt-4 flex items-center gap-3 rounded-xl border p-4 text-xs font-bold shadow-2xs',
        tone === 'success' &&
          'border-emerald-200 bg-emerald-50 text-emerald-900',
        tone === 'warning' &&
          'border-amber-200 bg-amber-50 text-amber-900',
        tone === 'danger' &&
          'border-rose-200 bg-rose-50 text-rose-900',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {tone === 'success' ? (
        <CheckCircleIcon
          className="text-emerald-600"
          size={20}
          weight="fill"
        />
      ) : (
        <WarningCircleIcon
          className={
            tone === 'warning' ? 'text-amber-600' : 'text-rose-600'
          }
          size={20}
          weight="fill"
        />
      )}
      <p>{message}</p>
    </div>
  )
}
