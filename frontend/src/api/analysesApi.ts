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
  reason:
    | 'INSUFFICIENT_CUSTOMERS'
    | 'MISSING_CUSTOMER_IDENTIFIERS'
    | null
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
  reason:
    | 'INSUFFICIENT_COHORT_HISTORY'
    | 'MISSING_CUSTOMER_IDENTIFIERS'
    | null
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

export type ProductOrderIssueMetric = {
  product_id: string
  product_name: string
  category: string
  total_order_count: number
  completed_order_count: number
  cancelled_order_count: number
  returned_order_count: number
  issue_order_count: number
  cancellation_rate_percent: number
  return_rate_percent: number
  issue_rate_percent: number
  ranking_score_percent: number
  affected_product_value: number
}

export type ProductOrderIssueAnalysis = {
  available: boolean
  reason:
    | 'INSUFFICIENT_PRODUCT_ORDERS'
    | 'NO_CANCELLED_OR_RETURNED_ORDERS'
    | null
  minimum_order_count: number
  ranking_method: 'adjusted_issue_rate_lower_bound'
  evaluated_product_count: number
  qualified_product_count: number
  affected_order_count: number
  affected_product_value: number
  products: ProductOrderIssueMetric[]
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
  primary_metric: 'daily_mae' | 'total_mae'
  baseline_method: 'seasonal_naive_7_days'
  horizon_days: 7 | 30
  minimum_fold_count: 2
  maximum_fold_count: 8
  minimum_history_days: number
  fold_count: number
  evaluation_points: number
  model_daily_metrics: ForecastErrorMetrics | null
  baseline_daily_metrics: ForecastErrorMetrics | null
  model_total_metrics: ForecastErrorMetrics | null
  baseline_total_metrics: ForecastErrorMetrics | null
  primary_mae_improvement_vs_baseline_percent: number | null
  reliability: 'high' | 'medium' | 'low' | 'unavailable'
  folds: Array<{
    fold: number
    training_days: number
    train_end_date: string
    validation_from: string
    validation_to: string
    model_daily_metrics: ForecastErrorMetrics
    baseline_daily_metrics: ForecastErrorMetrics
    model_total_revenue: number
    actual_total_revenue: number
    baseline_total_revenue: number
  }>
}

export type ForecastSelection = {
  available: boolean
  reason: 'INSUFFICIENT_SELECTION_HISTORY' | null
  strategy: 'rolling_origin_candidate_comparison'
  primary_metric: 'daily_mae' | 'total_mae'
  simplicity_tolerance_percent: 5
  minimum_fold_count: 2
  maximum_fold_count: 8
  minimum_history_days: number
  fold_count: number
  evaluation_points: number
  selected_method: ForecastMethod | null
  selection_reason:
    | 'LOWEST_PRIMARY_ERROR'
    | 'SIMPLER_WITHIN_FIVE_PERCENT'
    | null
  candidates: Array<{
    rank: number
    method: ForecastMethod
    minimum_training_days: number
    daily_metrics: ForecastErrorMetrics
    total_metrics: ForecastErrorMetrics
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
  total_interval_available: boolean
  total_interval_reason:
    | 'MODEL_SELECTION_UNAVAILABLE'
    | 'INSUFFICIENT_RESIDUALS'
    | null
  total_residual_count: number
  total_absolute_error_quantile: number | null
  observed_total_backtest_coverage_percent: number | null
}

export type ForecastResult = {
  available: boolean
  reason: 'INSUFFICIENT_HISTORY' | null
  horizon_days: 7 | 30
  minimum_history_days: number
  method: ForecastMethod | null
  history_days: number
  forecast_total: number | null
  previous_period_total: number | null
  change_vs_previous_period_percent: number | null
  total_lower_bound: number | null
  total_upper_bound: number | null
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

export type ForecastBundle = {
  default_horizon_days: 7
  horizons: ForecastResult[]
}

export type GrowthChangeType =
  | 'new'
  | 'growing'
  | 'stable'
  | 'declining'
  | 'inactive'

export type GrowthMetricBase = {
  comparison_type: 'month' | 'year'
  current_revenue: number
  previous_revenue: number
  revenue_change: number
  growth_rate_percent: number | null
  current_order_count: number
  previous_order_count: number
  order_count_change: number
  current_quantity: number
  previous_quantity: number
  quantity_change: number
  change_type: GrowthChangeType
  contribution_to_direction_percent: number
}

export type ProductGrowthMetric = GrowthMetricBase & {
  product_id: string
  product_name: string
  category: string
}

export type CategoryGrowthMetric = GrowthMetricBase & {
  category: string
}

export type GrowthDriverPeriod = {
  available: boolean
  reason: 'INSUFFICIENT_COMPARISON_HISTORY' | null
  comparison_type: 'month' | 'year'
  required_history_from: string
  current_period: { from: string; to: string }
  previous_period: { from: string; to: string }
  current_revenue: number | null
  previous_revenue: number | null
  net_revenue_change: number | null
  growth_rate_percent: number | null
  positive_revenue_change: number | null
  negative_revenue_change: number | null
  evaluated_product_count: number
  evaluated_category_count: number
  product_growth_drivers: ProductGrowthMetric[]
  product_decline_drivers: ProductGrowthMetric[]
  category_growth_drivers: CategoryGrowthMetric[]
  category_decline_drivers: CategoryGrowthMetric[]
}

export type GrowthDriverAnalysis = {
  default_comparison_type: 'month' | 'year'
  periods: GrowthDriverPeriod[]
}

export type SalesPeriodSummary = {
  key: string
  period_type: 'month' | 'year'
  period: { from: string; to: string }
  is_complete: boolean
  total_revenue: number
  total_orders: number
  total_quantity_sold: number
  average_order_value: number
  gross_revenue: number
  total_discount: number
  discount_rate_percent: number
  comparison: {
    available: boolean
    reason: 'INSUFFICIENT_COMPARISON_HISTORY' | null
    previous_period: { from: string; to: string }
    previous_revenue: number | null
    revenue_change: number | null
    growth_rate_percent: number | null
  }
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
  contract_version: '5.0'
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
    period_summaries: {
      months: SalesPeriodSummary[]
      years: SalesPeriodSummary[]
    }
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
    product_order_issues: ProductOrderIssueAnalysis
    growth_drivers: GrowthDriverAnalysis
  }
  customers: {
    available: boolean
    reason: 'MISSING_CUSTOMER_IDENTIFIERS' | null
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
  forecast: ForecastBundle
  report: ReportContent
  reports: Record<'en' | 'vi', ReportContent>
  upload: {
    mode: 'single' | 'combined'
    file_count: number
    source_files: Array<{
      file_name: string
      row_count: number
      source_type: StoredImportSourceType
      source_row_count: number | null
      skipped_row_count: number
    }>
    source_row_count: number
    effective_row_count: number
    duplicate_order_count: number
    duplicate_row_count: number
    source_type: StoredImportSourceType | 'mixed'
    import_profile_id: string | null
    header_fingerprint: string | null
    skipped_row_count: number
    capabilities: ImportCapabilities
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
  importConfig?: ImportRequestConfig
  onUploadProgress?: (percentage: number) => void
}

type CreateCombinedAnalysisOptions = {
  files: File[]
  importConfig?: ImportRequestConfig
  onUploadProgress?: (percentage: number) => void
}

export type ImportSourceType =
  | 'auto'
  | 'marketlens'
  | 'shopee'
  | 'tiktok'
  | 'custom'

export type StoredImportSourceType = Exclude<ImportSourceType, 'auto'>

export type CanonicalImportField =
  | 'order_id'
  | 'order_date'
  | 'customer_id'
  | 'customer_name'
  | 'product_id'
  | 'product_name'
  | 'category'
  | 'quantity'
  | 'unit_price'
  | 'discount'
  | 'line_revenue'
  | 'order_status'

export type CanonicalStatus =
  | 'completed'
  | 'cancelled'
  | 'returned'
  | 'skip'

export type ImportCapabilities = {
  sales_analytics: boolean
  product_analytics: boolean
  customer_analytics: boolean
  category_analytics: boolean
  discount_analytics: boolean
  cancellation_return_analysis: boolean
}

export type ImportRequestConfig = {
  source_type: ImportSourceType
  import_profile_id?: string | null
  column_mapping?: Partial<Record<CanonicalImportField, string>>
  status_mapping?: Record<string, CanonicalStatus>
}

export type ImportPreview = {
  requested_source_type: ImportSourceType
  detected_source_type: StoredImportSourceType | null
  detection_confidence: 'exact' | 'suggested' | 'unknown'
  header_fingerprint: string
  headers: string[]
  suggested_mapping: Record<CanonicalImportField, string | null>
  missing_required_fields: string[]
  status_values: string[]
  unknown_status_values: string[]
  row_count: number
  capabilities: ImportCapabilities
  warnings: string[]
  ready_for_analysis: boolean
}

export type ImportProfile = {
  id: string
  name: string
  source_type: StoredImportSourceType
  column_mapping: Partial<Record<CanonicalImportField, string>>
  status_mapping: Record<string, CanonicalStatus>
  header_fingerprint: string
  schema_version: 2
  created_at: string
  updated_at: string
}

export async function createAnalysis({
  file,
  importConfig,
  onUploadProgress,
}: CreateAnalysisOptions) {
  const formData = buildImportRequestFormData(
    [{ fieldName: 'file', file }],
    importConfig,
  )

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
  importConfig,
  onUploadProgress,
}: CreateCombinedAnalysisOptions) {
  const formData = buildImportRequestFormData(
    files.map((file) => ({ fieldName: 'files', file })),
    importConfig,
  )

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

export async function previewImport(
  file: File,
  importConfig: ImportRequestConfig,
) {
  const formData = buildImportRequestFormData(
    [{ fieldName: 'file', file }],
    importConfig,
  )
  const response = await httpClient.post<ImportPreview>(
    '/imports/preview',
    formData,
    { timeout: 60_000 },
  )
  return response.data
}

export async function listImportProfiles() {
  const response = await httpClient.get<{ items: ImportProfile[] }>(
    '/import-profiles',
  )
  return response.data.items
}

export async function createImportProfile(
  profile: Omit<ImportProfile, 'id' | 'created_at' | 'updated_at'>,
) {
  const response = await httpClient.post<ImportProfile>(
    '/import-profiles',
    profile,
  )
  return response.data
}

export async function updateImportProfile(
  profileId: string,
  changes: Partial<
    Omit<ImportProfile, 'id' | 'created_at' | 'updated_at'>
  >,
) {
  const response = await httpClient.patch<ImportProfile>(
    `/import-profiles/${profileId}`,
    changes,
  )
  return response.data
}

export async function deleteImportProfile(profileId: string) {
  await httpClient.delete(`/import-profiles/${profileId}`)
}

function appendImportConfig(
  formData: FormData,
  importConfig?: ImportRequestConfig,
) {
  if (!importConfig) return
  formData.append('source_type', importConfig.source_type)
  if (importConfig.import_profile_id) {
    formData.append('import_profile_id', importConfig.import_profile_id)
  }
  if (
    importConfig.column_mapping &&
    Object.keys(importConfig.column_mapping).length > 0
  ) {
    formData.append(
      'column_mapping',
      JSON.stringify(importConfig.column_mapping),
    )
  }
  if (
    importConfig.status_mapping &&
    Object.keys(importConfig.status_mapping).length > 0
  ) {
    formData.append(
      'status_mapping',
      JSON.stringify(importConfig.status_mapping),
    )
  }
}

export function buildImportRequestFormData(
  files: Array<{ fieldName: 'file' | 'files'; file: File }>,
  importConfig?: ImportRequestConfig,
) {
  const formData = new FormData()
  files.forEach(({ fieldName, file }) => {
    formData.append(fieldName, file)
  })
  appendImportConfig(formData, importConfig)
  return formData
}
