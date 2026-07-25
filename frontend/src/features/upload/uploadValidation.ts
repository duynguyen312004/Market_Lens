export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const MAX_UPLOAD_FILES = 10
export const ALLOWED_UPLOAD_EXTENSIONS = ['.csv', '.xlsx'] as const

type UploadCandidate = {
  name: string
  size: number
}

export function validateUploadCandidate(
  file: UploadCandidate,
  language: Language = 'en',
) {
  const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`

  if (!ALLOWED_UPLOAD_EXTENSIONS.includes(
    extension as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number],
  )) {
    return translate(language, 'upload.clientType')
  }
  if (file.size === 0) {
    return translate(language, 'upload.clientEmpty')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return translate(language, 'upload.clientSize')
  }
  return null
}

export function validateUploadSelection(
  files: UploadCandidate[],
  mode: 'single' | 'combined',
  language: Language = 'en',
) {
  if (mode === 'single' && files.length !== 1) {
    return translate(language, 'upload.singleFileRequired')
  }
  if (mode === 'combined' && files.length < 2) {
    return translate(language, 'upload.minimumFiles')
  }
  if (files.length > MAX_UPLOAD_FILES) {
    return translate(language, 'upload.maximumFiles', {
      count: MAX_UPLOAD_FILES,
    })
  }

  const duplicateNames = files.filter(
    (file, index) =>
      files.findIndex(
        (candidate) =>
          candidate.name.trim().toLocaleLowerCase() ===
          file.name.trim().toLocaleLowerCase(),
      ) !== index,
  )
  if (duplicateNames.length > 0) {
    return translate(language, 'upload.duplicateFileNames')
  }

  for (const file of files) {
    const fileError = validateUploadCandidate(file, language)
    if (fileError) {
      return `${file.name}: ${fileError}`
    }
  }

  const totalBytes = files.reduce((total, file) => total + file.size, 0)
  if (totalBytes > MAX_UPLOAD_BYTES) {
    return translate(language, 'upload.combinedSize')
  }
  return null
}

export function getUploadColumnLabel(
  column: string | undefined,
  language: Language,
) {
  if (!column) return translate(language, 'upload.validationError')
  const key = `upload.column.${column}`
  const translated = translate(language, key)
  return translated === key ? column : translated
}

export function getUploadReasonLabel(reason: string, language: Language) {
  const key = `upload.reason.${reason}`
  const translated = translate(language, key)
  return translated === key ? reason.replaceAll('_', ' ') : translated
}
import { translate, type Language } from '../../i18n/LanguageContext'
