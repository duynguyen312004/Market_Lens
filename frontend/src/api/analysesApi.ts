import { httpClient } from './httpClient'

export type AnalysisSummary = {
  total_revenue: number
  total_orders: number
  total_customers: number
  total_quantity_sold: number
  growth_rate_percent: number | null
}

export type AnalysisPeriod = {
  from: string
  to: string
  history_days: number
}

export type ProductMetric = {
  product_id: string
  product_name: string
  category: string
  revenue: number
  quantity: number
  order_count: number
}

export type CategoryMetric = {
  category: string
  revenue: number
  quantity: number
  revenue_share_percent: number
}

export type CustomerMetric = {
  customer_id: string
  customer_name: string
  revenue: number
  order_count: number
  quantity: number
  first_order_date: string
  last_order_date: string
  segment: 'new' | 'returning' | 'vip'
}

export type ForecastResult = {
  available: boolean
  method: string | null
  history_days: number
  forecast_days: number
  forecast_total: number | null
  change_vs_last_7_days_percent: number | null
  points: Array<{
    date: string
    predicted_revenue: number
  }>
  disclaimer: string
}

export type ReportContent = {
  source: 'rule_based' | 'ai'
  title: string
  summary: string
  highlights: string[]
  trend_analysis: string
  recommendations: Array<{
    title: string
    description: string
  }>
  disclaimer: string
}

export type AnalysisDetail = {
  id: string
  file_name: string
  status: 'processing' | 'completed' | 'failed'
  row_count: number
  created_at: string
  period: AnalysisPeriod
  summary: AnalysisSummary
  revenue_by_date: Array<{
    date: string
    revenue: number
  }>
  sales: {
    revenue_by_month: Array<{ month: string; revenue: number }>
    revenue_by_category: CategoryMetric[]
    top_products_by_revenue: ProductMetric[]
    top_products_by_quantity: ProductMetric[]
    lowest_quantity_products: ProductMetric[]
  }
  customers: {
    segments: {
      new: number
      returning: number
      vip: number
    }
    potential_count: number
    potential_customers: CustomerMetric[]
    top_customers: CustomerMetric[]
  }
  forecast: ForecastResult
  report: ReportContent
  warnings: string[]
}

export type AnalysisListItem = {
  id: string
  file_name: string
  status: AnalysisDetail['status']
  row_count: number
  date_from: string | null
  date_to: string | null
  created_at: string
}

export type AnalysisListResponse = {
  items: AnalysisListItem[]
  limit: number
  offset: number
}

export type AIReportGenerationResponse = {
  analysis_id: string
  source: ReportContent['source']
  report: ReportContent
  warning: {
    code: string
    message: string
  } | null
}

type CreateAnalysisOptions = {
  file: File
  onUploadProgress?: (percentage: number) => void
}

export async function createAnalysis({
  file,
  onUploadProgress,
}: CreateAnalysisOptions) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await httpClient.post<AnalysisDetail>(
    '/analyses',
    formData,
    {
      timeout: 60_000,
      onUploadProgress: (event) => {
        if (!event.total || !onUploadProgress) return
        onUploadProgress(
          Math.min(100, Math.round((event.loaded / event.total) * 100)),
        )
      },
    },
  )
  return response.data
}

export async function listAnalyses(limit = 20, offset = 0) {
  const response = await httpClient.get<AnalysisListResponse>('/analyses', {
    params: { limit, offset },
  })
  return response.data
}

export async function getAnalysis(analysisId: string) {
  const response = await httpClient.get<AnalysisDetail>(
    `/analyses/${analysisId}`,
  )
  return response.data
}

export async function generateAiReport(analysisId: string) {
  const response = await httpClient.post<AIReportGenerationResponse>(
    `/analyses/${analysisId}/ai-report`,
    undefined,
    { timeout: 30_000 },
  )
  return response.data
}

export async function deleteAnalysis(analysisId: string) {
  await httpClient.delete(`/analyses/${analysisId}`)
}
