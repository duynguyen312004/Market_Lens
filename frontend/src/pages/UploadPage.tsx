import {
  ArrowRightIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  FileCsvIcon,
  FileXlsIcon,
  FilesIcon,
  InfoIcon,
  ProhibitIcon,
  SpinnerGapIcon,
  TrashIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Link } from 'react-router'

import {
  createAnalysis,
  createCombinedAnalysis,
} from '../api/analysesApi'
import { parseApiError, type ParsedApiError } from '../api/apiErrors'
import { queryClient } from '../app/queryClient'
import {
  analysisKeys,
} from '../features/analysis/analysisQueries'
import { useActiveAnalysis } from '../features/analysis/ActiveAnalysisContext'
import {
  getUploadColumnLabel,
  getUploadReasonLabel,
  validateUploadCandidate,
  validateUploadSelection,
} from '../features/upload/uploadValidation'
import { useLanguage } from '../i18n/LanguageContext'
import {
  formatDate,
  formatFileSize,
  formatInteger,
} from '../utils/formatters'

export function UploadPage() {
  const { language, t } = useLanguage()
  const { selectAnalysis } = useActiveAnalysis()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploadMode, setUploadMode] = useState<'single' | 'combined'>('single')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [clientError, setClientError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<ParsedApiError | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const uploadMutation = useMutation({
    mutationFn: ({
      files,
      mode,
    }: {
      files: File[]
      mode: 'single' | 'combined'
    }) =>
      mode === 'single'
        ? createAnalysis({
            file: files[0],
            onUploadProgress: setUploadProgress,
          })
        : createCombinedAnalysis({
            files,
            onUploadProgress: setUploadProgress,
          }),
    onMutate: () => {
      setServerError(null)
      setUploadProgress(0)
    },
    onSuccess: (analysis) => {
      setUploadProgress(100)
      selectAnalysis(analysis.id)
      queryClient.setQueryData(analysisKeys.detail(analysis.id), analysis)
      void queryClient.invalidateQueries({ queryKey: analysisKeys.all })
    },
    onError: (error) => {
      setServerError(parseApiError(error, language))
    },
  })

  function selectFiles(files: File[]) {
    if (files.length === 0) return

    setClientError(null)
    setServerError(null)
    uploadMutation.reset()

    const nextFiles =
      uploadMode === 'single'
        ? files.slice(0, 1)
        : [...selectedFiles, ...files]
    const invalidFile = nextFiles.find(
      (file) => validateUploadCandidate(file, language) !== null,
    )
    if (invalidFile) {
      setClientError(
        `${invalidFile.name}: ${validateUploadCandidate(invalidFile, language)}`,
      )
      return
    }

    if (uploadMode === 'combined' && nextFiles.length >= 2) {
      const selectionError = validateUploadSelection(
        nextFiles,
        uploadMode,
        language,
      )
      if (selectionError) {
        setClientError(selectionError)
        return
      }
    }

    setSelectedFiles(nextFiles)
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    selectFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    if (uploadMutation.isPending) return
    selectFiles(Array.from(event.dataTransfer.files ?? []))
  }

  function clearSelection() {
    setSelectedFiles([])
    setClientError(null)
    setServerError(null)
    setUploadProgress(0)
    uploadMutation.reset()
  }

  function changeMode(mode: 'single' | 'combined') {
    if (mode === uploadMode || uploadMutation.isPending) return
    setUploadMode(mode)
    clearSelection()
  }

  function removeFile(index: number) {
    const nextFiles = selectedFiles.filter(
      (_, fileIndex) => fileIndex !== index,
    )
    setSelectedFiles(nextFiles)
    setClientError(null)
    setServerError(null)
    uploadMutation.reset()
  }

  function submitFiles() {
    if (uploadMutation.isPending) return
    const validationError = validateUploadSelection(
      selectedFiles,
      uploadMode,
      language,
    )
    if (validationError) {
      setClientError(validationError)
      return
    }
    uploadMutation.mutate({ files: selectedFiles, mode: uploadMode })
  }

  const analysis = uploadMutation.data
  const selectedBytes = selectedFiles.reduce(
    (total, file) => total + file.size,
    0,
  )

  return (
    <main className="px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            {t('nav.upload')}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {t('upload.title')}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {t('upload.desc')}
          </p>
        </header>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
          <section className="data-panel rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
            <div
              aria-label={t('upload.modeLabel')}
              className="mb-6 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1"
              role="group"
            >
              <button
                aria-pressed={uploadMode === 'single'}
                className={`rounded-lg px-4 py-2.5 text-sm font-extrabold transition ${
                  uploadMode === 'single'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => changeMode('single')}
                type="button"
              >
                {t('upload.modeSingle')}
              </button>
              <button
                aria-pressed={uploadMode === 'combined'}
                className={`rounded-lg px-4 py-2.5 text-sm font-extrabold transition ${
                  uploadMode === 'combined'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => changeMode('combined')}
                type="button"
              >
                {t('upload.modeCombined')}
              </button>
            </div>

            {/* Drag and Drop Zone */}
            <div
              className={`grid min-h-72 place-items-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200 ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/70 scale-[0.99]'
                  : 'border-slate-200 bg-slate-50/60 hover:border-indigo-300 hover:bg-slate-50'
              }`}
              onDragEnter={(event) => {
                event.preventDefault()
                if (!uploadMutation.isPending) setIsDragging(true)
              }}
              onDragLeave={(event) => {
                event.preventDefault()
                if (event.currentTarget === event.target) setIsDragging(false)
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <div>
                <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-xs border border-indigo-100">
                  <CloudArrowUpIcon aria-hidden="true" size={34} weight="duotone" />
                </span>
                <h2 className="mt-5 text-lg font-black tracking-tight text-slate-900">
                  {uploadMode === 'single'
                    ? t('upload.dropzone')
                    : t('upload.dropzoneCombined')}
                </h2>
                <p className="mt-1.5 text-xs text-slate-500 max-w-sm mx-auto">
                  {uploadMode === 'single'
                    ? t('upload.supportedFormat')
                    : t('upload.combinedFormat')}
                </p>
                <button
                  className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-extrabold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-55"
                  disabled={uploadMutation.isPending}
                  onClick={() => inputRef.current?.click()}
                  type="button"
                >
                  {t('upload.browse')}
                </button>
                <input
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  aria-label={t('upload.chooseFileAria')}
                  className="sr-only"
                  multiple={uploadMode === 'combined'}
                  onChange={handleInputChange}
                  ref={inputRef}
                  type="file"
                />
              </div>
            </div>

            {(clientError || serverError) && (
              <UploadError clientError={clientError} error={serverError} />
            )}

            {/* Selected File Card & Progress */}
            {selectedFiles.length > 0 && !analysis && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {t('upload.selectedFiles', {
                        count: selectedFiles.length,
                      })}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      {formatFileSize(selectedBytes, language)}
                    </p>
                  </div>
                  <button
                    className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-white hover:text-rose-700"
                    disabled={uploadMutation.isPending}
                    onClick={clearSelection}
                    type="button"
                  >
                    {t('upload.clearAll')}
                  </button>
                </div>

                <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <li
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                      key={`${file.name}-${file.size}-${index}`}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
                        {file.name.toLowerCase().endsWith('.xlsx') ? (
                          <FileXlsIcon
                            aria-hidden="true"
                            size={20}
                            weight="duotone"
                          />
                        ) : (
                          <FileCsvIcon
                            aria-hidden="true"
                            size={20}
                            weight="duotone"
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-extrabold text-slate-900">
                          {file.name}
                        </span>
                        <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                          {formatFileSize(file.size, language)}
                        </span>
                      </span>
                      <button
                        aria-label={t('upload.removeNamedFileAria', {
                          name: file.name,
                        })}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        disabled={uploadMutation.isPending}
                        onClick={() => removeFile(index)}
                        type="button"
                      >
                        <TrashIcon aria-hidden="true" size={17} />
                      </button>
                    </li>
                  ))}
                </ul>

                {uploadMutation.isPending && (
                  <div className="mt-5" role="status">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-2">
                        <SpinnerGapIcon
                          aria-hidden="true"
                          className="animate-spin text-indigo-600"
                          size={18}
                          weight="bold"
                        />
                        {uploadProgress < 100
                          ? t('upload.uploading')
                          : t('upload.processing')}
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                        style={{ width: `${Math.max(uploadProgress, 5)}%` }}
                      />
                    </div>
                  </div>
                )}

                {!uploadMutation.isPending && (
                  <button
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 active:scale-[0.98] transition"
                    onClick={submitFiles}
                    type="button"
                  >
                    {uploadMode === 'single'
                      ? t('upload.startAnalysis')
                      : t('upload.startCombinedAnalysis', {
                          count: selectedFiles.length,
                        })}
                    <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
                  </button>
                )}
              </div>
            )}

            {/* Analysis Success Preview Card */}
            {analysis && (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
                <div className="flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
                    <CheckCircleIcon size={28} weight="fill" />
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-emerald-950">
                      {t('upload.successTitle')}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                      {analysis.upload_mode === 'combined'
                        ? t('upload.combinedSuccessDesc', {
                            files: analysis.source_file_count,
                            count: formatInteger(
                              analysis.row_count,
                              language,
                            ),
                            from: formatDate(
                              analysis.period.from,
                              language,
                            ),
                            to: formatDate(
                              analysis.period.to,
                              language,
                            ),
                          })
                        : t('upload.successDesc', {
                            name: analysis.file_name,
                            count: formatInteger(
                              analysis.row_count,
                              language,
                            ),
                            from: formatDate(
                              analysis.period.from,
                              language,
                            ),
                            to: formatDate(
                              analysis.period.to,
                              language,
                            ),
                          })}
                    </p>
                    {analysis.upload.duplicate_order_count > 0 && (
                      <p className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-900">
                        <FilesIcon
                          aria-hidden="true"
                          className="shrink-0"
                          size={16}
                        />
                        {t('upload.duplicatesRemoved', {
                          orders: analysis.upload.duplicate_order_count,
                          rows: analysis.upload.duplicate_row_count,
                        })}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white shadow-xs hover:bg-emerald-800 transition"
                        to="/dashboard"
                      >
                        {t('upload.goDashboard')}
                        <ArrowRightIcon size={16} weight="bold" />
                      </Link>
                      <button
                        className="rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100/50 transition"
                        onClick={clearSelection}
                        type="button"
                      >
                        {t('upload.another')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Template Info & Calculation Rules */}
          <aside className="space-y-5">
            <div className="data-panel rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <h2 className="font-black text-slate-900">{t('upload.requiredTemplate')}</h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                {t('upload.templateDesc')}
              </p>
              <a
                className="mt-4 inline-flex items-center gap-2 text-xs font-black text-indigo-600 hover:underline"
                download
                href="/sample_sales_template.csv"
              >
                <FileCsvIcon aria-hidden="true" size={18} weight="duotone" />
                {t('upload.downloadTemplate')}
              </a>
              <a
                className="mt-3 flex items-center gap-2 text-xs font-black text-indigo-600 hover:underline"
                download
                href="/marketlens_ds_demo_365_days.csv"
              >
                <FileCsvIcon aria-hidden="true" size={18} weight="duotone" />
                {t('upload.downloadDemo')}
              </a>
              {uploadMode === 'combined' && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <p className="text-[11px] font-bold text-slate-500">
                    {t('upload.combinedDemoLabel')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                    <a
                      className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:underline"
                      download
                      href="/marketlens_combined_demo_part_1.csv"
                    >
                      <FileCsvIcon size={16} weight="duotone" />
                      {t('upload.demoPart', { number: 1 })}
                    </a>
                    <a
                      className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:underline"
                      download
                      href="/marketlens_combined_demo_part_2.csv"
                    >
                      <FileCsvIcon size={16} weight="duotone" />
                      {t('upload.demoPart', { number: 2 })}
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="data-panel rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <h2 className="font-black text-slate-900">{t('upload.calculationRules')}</h2>
              <div className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-600">
                <p className="flex gap-2">
                  <InfoIcon className="mt-0.5 shrink-0 text-indigo-600" size={16} weight="fill" />
                  {t('upload.lineItemRule')}
                </p>
                <p className="flex gap-2">
                  <InfoIcon className="mt-0.5 shrink-0 text-indigo-600" size={16} weight="fill" />
                  {t('upload.completedRule')}
                </p>
                <p className="flex gap-2">
                  <InfoIcon className="mt-0.5 shrink-0 text-indigo-600" size={16} weight="fill" />
                  {t('upload.combinedRule')}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

function UploadError({
  clientError,
  error,
}: {
  clientError: string | null
  error: ParsedApiError | null
}) {
  const { language, t } = useLanguage()
  if (clientError) {
    return (
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
        <ProhibitIcon className="shrink-0 text-rose-600" size={18} weight="bold" />
        <p>{clientError}</p>
      </div>
    )
  }

  if (!error) return null
  const columnDetailGroups = [
    ['missing', 'upload.missingColumns'],
    ['extra', 'upload.extraColumns'],
    ['duplicates', 'upload.duplicateColumns'],
  ] as const

  return (
    <div className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">
      <WarningCircleIcon className="shrink-0 text-rose-600" size={18} weight="bold" />
      <div>
        <p className="font-extrabold">{error.message}</p>
        <p className="mt-1 text-[11px] text-rose-700">
          {t('common.errorCode')}: {error.code}
        </p>
        {typeof error.details?.file_name === 'string' && (
          <p className="mt-1 text-[11px] font-bold text-rose-800">
            {t('upload.errorFile', {
              name: error.details.file_name,
            })}
          </p>
        )}
        {columnDetailGroups.map(([field, key]) => {
          const values = error.details?.[field]
          if (!Array.isArray(values) || values.length === 0) return null
          return (
            <p className="mt-1 text-[11px] text-rose-800" key={field}>
              {t(key, {
                columns: values
                  .map((value) =>
                    getUploadColumnLabel(String(value), language),
                  )
                  .join(', '),
              })}
            </p>
          )
        })}
        {error.details?.errors && error.details.errors.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-4 text-[11px] text-rose-800">
            {error.details.errors.slice(0, 8).map((item, index) => {
              const fieldLocation =
                item.row !== undefined
                  ? `${t('upload.errorRow', { row: item.row })} - ${getUploadColumnLabel(item.column, language)}`
                  : item.identifier
                    ? `${getUploadColumnLabel(item.column, language)} - ${t('upload.errorIdentifier', { identifier: item.identifier })}`
                    : getUploadColumnLabel(item.column, language)
              const sourceFiles =
                item.file_name
                  ? [item.file_name]
                  : item.files ?? []
              const location =
                sourceFiles.length > 0
                  ? `${sourceFiles.join(', ')} - ${fieldLocation}`
                  : fieldLocation
              return (
                <li key={`${item.row ?? item.identifier ?? 'file'}-${item.column ?? 'unknown'}-${index}`}>
                  {t('upload.errorDetail', {
                    location,
                    reason: getUploadReasonLabel(item.reason, language),
                  })}
                </li>
              )
            })}
          </ul>
        )}
        {typeof error.details?.total_error_count === 'number' &&
          error.details.total_error_count > 8 && (
            <p className="mt-2 text-[11px] font-bold text-rose-800">
              {t('upload.moreErrors', {
                count: error.details.total_error_count - 8,
              })}
            </p>
          )}
      </div>
    </div>
  )
}
