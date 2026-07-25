import { httpClient } from './httpClient'

export type AnalysisSummary = {
  total_revenue: number
  total_orders: number
  total_customers: number
  total_quantity_sold: number
  growth_rate_percent: number | null
  average_order_value: number
  average_revenue_per_customer: number
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

export type WeekdayRevenueMetric = {
  weekday:
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday'
  weekday_index: number
  revenue: number
  order_count: number
  revenue_share_percent: number
}

export type SegmentRevenueMetric = {
  segment: 'new' | 'returning' | 'vip'
  customer_count: number
  revenue: number
  revenue_share_percent: number
}

export type RfmSegment =
  | 'new'
  | 'champion'
  | 'loyal'
  | 'at_risk'
  | 'regular'

export type RfmCustomerMetric = {
  customer_id: string
  customer_name: string
  recency_days: number
  frequency: number
  monetary: number
  recency_score: number
  frequency_score: number
  monetary_score: number
  total_score: number
  segment: RfmSegment
}

export type RfmAnalysis = {
  available: boolean
  reason: 'INSUFFICIENT_CUSTOMERS' | null
  snapshot_date: string
  customer_count: number
  minimum_customers: number
  score_scale: number
  scoring_method: 'empirical_quintile_average_rank'
  segment_rules_version: 'rfm_v1'
  segments: Record<RfmSegment, number>
  segment_revenue: Array<{
    segment: RfmSegment
    customer_count: number
    revenue: number
    revenue_share_percent: number
  }>
  top_customers: RfmCustomerMetric[]
  at_risk_customers: RfmCustomerMetric[]
}

export type AbcClass = 'A' | 'B' | 'C'

export type AbcProductMetric = ProductMetric & {
  abc_class: AbcClass
  revenue_share_percent: number
  cumulative_revenue_share_percent: number
}

export type ProductIntelligence = {
  abc: {
    method: 'cumulative_revenue_80_95'
    classified_product_count: number
    classes: Record<
      AbcClass,
      {
        product_count: number
        revenue: number
        revenue_share_percent: number
      }
    >
    representative_products: AbcProductMetric[]
  }
  associations: {
    available: boolean
    reason:
      | 'NO_MULTI_PRODUCT_ORDERS'
      | 'INSUFFICIENT_ASSOCIATION_SUPPORT'
      | null
    total_completed_orders: number
    eligible_completed_order_count: number
    basket_order_count: number
    eligible_basket_order_count: number
    skipped_oversized_order_count: number
    max_products_per_basket: number
    minimum_pair_order_count: number
    minimum_support_percent: number
    observed_pair_count: number
    qualified_pair_count: number
    rules: Array<{
      source_product_id: string
      source_product_name: string
      target_product_id: string
      target_product_name: string
      pair_order_count: number
      source_order_count: number
      target_order_count: number
      support_percent: number
      confidence_percent: number
      lift: number
    }>
  }
}

export type CustomerCohortAnalysis = {
  available: boolean
  reason: 'INSUFFICIENT_COHORT_HISTORY' | null
  method: 'acquisition_month_completed_orders'
  period_from: string
  period_to: string
  observed_month_count: number
  minimum_month_count: number
  customer_count: number
  cohort_count: number
  maximum_observed_month_index: number
  cohorts: Array<{
    cohort_month: string
    cohort_size: number
    periods: Array<{
      month_index: number
      activity_month: string
      active_customers: number
      retention_percent: number
      revenue: number
      order_count: number
    }>
  }>
}

export type DiscountAnalysis = {
  available: boolean
  reason: 'NO_DISCOUNT_DATA' | null
  gross_revenue: number
  discount_amount: number
  net_revenue: number
  discount_rate_percent: number
  discounted_order_count: number
  discounted_order_rate_percent: number
  by_product: Array<{
    product_id: string
    product_name: string
    category: string
    gross_revenue: number
    discount_amount: number
    net_revenue: number
    discount_rate_percent: number
    order_count: number
  }>
  by_category: Array<{
    category: string
    gross_revenue: number
    discount_amount: number
    net_revenue: number
    discount_rate_percent: number
    order_count: number
  }>
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

export type ForecastMethod =
  | 'seasonal_naive_7_days'
  | 'moving_average_7_days'
  | 'weekday_average_4_weeks'
  | 'linear_trend_30_days'

export type ForecastErrorMetrics = {
  mae: number
  rmse: number
  smape_percent: number
}

export type ForecastEvaluation = {
  available: boolean
  reason:
    | 'FORECAST_UNAVAILABLE'
    | 'INSUFFICIENT_SELECTION_HISTORY'
    | null
  strategy: 'rolling_origin_selected_method'
  evaluated_method: ForecastMethod | null
  baseline_method: 'seasonal_naive_7_days'
  horizon_days: 7
  minimum_fold_count: 2
  maximum_fold_count: 8
  minimum_history_days: number
  fold_count: number
  evaluation_points: number
  model_metrics: ForecastErrorMetrics | null
  baseline_metrics: ForecastErrorMetrics | null
  mae_improvement_vs_baseline_percent: number | null
  reliability: 'high' | 'medium' | 'low' | 'unavailable'
  folds: Array<{
    fold: number
    training_days: number
    train_end_date: string
    validation_from: string
    validation_to: string
    model_metrics: ForecastErrorMetrics
    baseline_metrics: ForecastErrorMetrics
  }>
}

export type ForecastSelection = {
  available: boolean
  reason: 'INSUFFICIENT_SELECTION_HISTORY' | null
  strategy: 'rolling_origin_candidate_comparison'
  primary_metric: 'mae'
  simplicity_tolerance_percent: 5
  minimum_fold_count: 2
  maximum_fold_count: 8
  minimum_history_days: 28
  fold_count: number
  evaluation_points: number
  selected_method: ForecastMethod | null
  selection_reason:
    | 'LOWEST_MAE'
    | 'SIMPLER_WITHIN_FIVE_PERCENT'
    | null
  candidates: Array<{
    rank: number
    method: ForecastMethod
    minimum_training_days: number
    metrics: ForecastErrorMetrics
  }>
}

export type ForecastUncertainty = {
  available: boolean
  reason: 'MODEL_SELECTION_UNAVAILABLE' | 'INSUFFICIENT_RESIDUALS' | null
  method: 'empirical_absolute_error_quantile'
  target_coverage_percent: 80
  residual_count: number
  absolute_error_quantile: number | null
  observed_backtest_coverage_percent: number | null
}

export type ForecastResult = {
  available: boolean
  method: ForecastMethod | null
  history_days: number
  forecast_days: number
  forecast_total: number | null
  change_vs_last_7_days_percent: number | null
  points: Array<{
    date: string
    predicted_revenue: number
    lower_bound: number | null
    upper_bound: number | null
  }>
  selection: ForecastSelection
  evaluation: ForecastEvaluation
  uncertainty: ForecastUncertainty
  disclaimer: string
}

export type ReportEvidence = {
  metric_key: string
  label: string
  value: number | string
  unit: 'vnd' | 'count' | 'percent' | 'days' | 'ratio' | 'label'
  context: string | null
}

export type ReportContent = {
  report_version: '2.0'
  source: 'rule_based' | 'ai'
  language: 'en' | 'vi'
  generated_at: string
  generator: {
    provider: 'rules' | 'gemini' | 'openai'
    model: string | null
  }
  title: string
  executive_summary: string
  kpi_snapshot: ReportEvidence[]
  data_quality: {
    status: 'good' | 'attention'
    summary: string
    signals: Array<{
      code: string
      severity: 'info' | 'warning'
      message: string
      evidence: ReportEvidence[]
    }>
    warning_codes: string[]
  }
  sections: Array<{
    key: 'revenue' | 'products' | 'customers' | 'forecast'
    title: string
    narrative: string
    evidence: ReportEvidence[]
  }>
  risk_signals: Array<{
    code: string
    severity: 'info' | 'warning' | 'critical'
    title: string
    description: string
    evidence: ReportEvidence[]
  }>
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low'
    title: string
    evidence: ReportEvidence[]
    action: string
    success_metric: string
  }>
  disclaimer: string
}

export type AnalysisDetail = {
  contract_version: '3.0'
  id: string
  file_name: string
  upload_mode: 'single' | 'combined'
  source_file_count: number
  status: 'processing' | 'completed' | 'failed'
  row_count: number
  created_at: string
  period: AnalysisPeriod
  summary: AnalysisSummary
  orders: {
    total_orders_all_statuses: number
    by_status: {
      completed: number
      cancelled: number
      returned: number
    }
    status_rates_percent: {
      completed: number
      cancelled: number
      returned: number
    }
    average_items_per_completed_order: number
  }
  revenue_by_date: Array<{
    date: string
    revenue: number
  }>
  sales: {
    gross_revenue: number
    total_discount: number
    discount_rate_percent: number
    revenue_by_month: Array<{ month: string; revenue: number }>
    revenue_by_weekday: WeekdayRevenueMetric[]
    revenue_by_category: CategoryMetric[]
    top_products_by_revenue: ProductMetric[]
    top_products_by_quantity: ProductMetric[]
    lowest_quantity_products: ProductMetric[]
    peak_revenue_day: { date: string; revenue: number } | null
    lowest_nonzero_revenue_day: {
      date: string
      revenue: number
    } | null
    concentration: {
      top_product_revenue_share_percent: number
      top_category_revenue_share_percent: number
      top_20_percent_product_count: number
      top_20_percent_products_revenue_share_percent: number
    }
    product_intelligence: ProductIntelligence
    discount_analysis: DiscountAnalysis
  }
  customers: {
    segments: {
      new: number
      returning: number
      vip: number
    }
    repeat_customer_count: number
    repeat_customer_rate_percent: number
    revenue_by_segment: SegmentRevenueMetric[]
    potential_count: number
    potential_customers: CustomerMetric[]
    top_customers: CustomerMetric[]
    rfm: RfmAnalysis
    cohort_analysis: CustomerCohortAnalysis
  }
  forecast: ForecastResult
  report: ReportContent
  reports: Record<'en' | 'vi', ReportContent>
  upload: {
    mode: 'single' | 'combined'
    file_count: number
    source_files: Array<{
      file_name: string
      row_count: number
    }>
    source_row_count: number
    effective_row_count: number
    duplicate_order_count: number
    duplicate_row_count: number
  }
  warnings: string[]
}

export type AnalysisListItem = {
  id: string
  file_name: string
  upload_mode: AnalysisDetail['upload_mode']
  source_file_count: number
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
  language: 'en' | 'vi'
  warning: {
    code: string
    message: string
  } | null
}

type CreateAnalysisOptions = {
  file: File
  onUploadProgress?: (percentage: number) => void
}

type CreateCombinedAnalysisOptions = {
  files: File[]
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

export async function createCombinedAnalysis({
  files,
  onUploadProgress,
}: CreateCombinedAnalysisOptions) {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  const response = await httpClient.post<AnalysisDetail>(
    '/analyses/combined',
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

export async function generateAiReport(
  analysisId: string,
  language: 'en' | 'vi',
) {
  const response = await httpClient.post<AIReportGenerationResponse>(
    `/analyses/${analysisId}/ai-report`,
    undefined,
    { params: { language }, timeout: 30_000 },
  )
  return response.data
}

export async function deleteAnalysis(analysisId: string) {
  await httpClient.delete(`/analyses/${analysisId}`)
}
