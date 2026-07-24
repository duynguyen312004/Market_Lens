export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const ALLOWED_UPLOAD_EXTENSIONS = ['.csv', '.xlsx'] as const

type UploadCandidate = {
  name: string
  size: number
}

export function validateUploadCandidate(file: UploadCandidate) {
  const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`

  if (!ALLOWED_UPLOAD_EXTENSIONS.includes(
    extension as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number],
  )) {
    return 'Chỉ hỗ trợ file CSV hoặc XLSX.'
  }
  if (file.size === 0) {
    return 'File đang rỗng. Hãy chọn file có dữ liệu.'
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'File vượt quá giới hạn 10 MB.'
  }
  return null
}
