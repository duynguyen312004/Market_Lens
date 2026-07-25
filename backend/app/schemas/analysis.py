from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AnalysisListItem(BaseModel):
    id: UUID
    file_name: str
    upload_mode: Literal["single", "combined"] = "single"
    source_file_count: int = 1
    status: Literal["processing", "completed", "failed"]
    row_count: int
    date_from: date | None = None
    date_to: date | None = None
    created_at: datetime


class AnalysisListResponse(BaseModel):
    items: list[AnalysisListItem]
    limit: int
    offset: int


class StrictContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class AnalysisPeriod(StrictContractModel):
    from_: date = Field(alias="from")
    to: date
    history_days: int


class AnalysisSummary(StrictContractModel):
    total_revenue: float
    total_orders: int
    total_customers: int
    total_quantity_sold: int
    growth_rate_percent: float | None
    average_order_value: float
    average_revenue_per_customer: float


class OrderStatusCounts(StrictContractModel):
    completed: int
    cancelled: int
    returned: int


class OrderStatusRates(StrictContractModel):
    completed: float
    cancelled: float
    returned: float


class OrderAnalytics(StrictContractModel):
    total_orders_all_statuses: int
    by_status: OrderStatusCounts
    status_rates_percent: OrderStatusRates
    average_items_per_completed_order: float


class RevenueDayMetric(StrictContractModel):
    date: date
    revenue: float


class RevenueMonthMetric(StrictContractModel):
    month: str
    revenue: float


class ProductMetric(StrictContractModel):
    product_id: str
    product_name: str
    category: str
    revenue: float
    quantity: int
    order_count: int


class CategoryMetric(StrictContractModel):
    category: str
    revenue: float
    quantity: int
    revenue_share_percent: float


class WeekdayRevenueMetric(StrictContractModel):
    weekday: Literal[
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    ]
    weekday_index: int
    revenue: float
    order_count: int
    revenue_share_percent: float


class RevenueConcentration(StrictContractModel):
    top_product_revenue_share_percent: float
    top_category_revenue_share_percent: float
    top_20_percent_product_count: int
    top_20_percent_products_revenue_share_percent: float


class ABCClassMetric(StrictContractModel):
    product_count: int
    revenue: float
    revenue_share_percent: float


class ABCClasses(StrictContractModel):
    A: ABCClassMetric
    B: ABCClassMetric
    C: ABCClassMetric


class ABCProductMetric(ProductMetric):
    abc_class: Literal["A", "B", "C"]
    revenue_share_percent: float
    cumulative_revenue_share_percent: float


class ABCAnalysis(StrictContractModel):
    method: Literal["cumulative_revenue_80_95"]
    classified_product_count: int
    classes: ABCClasses
    representative_products: list[ABCProductMetric]


class ProductAssociationRule(StrictContractModel):
    source_product_id: str
    source_product_name: str
    target_product_id: str
    target_product_name: str
    pair_order_count: int
    source_order_count: int
    target_order_count: int
    support_percent: float
    confidence_percent: float
    lift: float


class ProductAssociationAnalysis(StrictContractModel):
    available: bool
    reason: Literal[
        "NO_MULTI_PRODUCT_ORDERS",
        "INSUFFICIENT_ASSOCIATION_SUPPORT",
    ] | None
    total_completed_orders: int
    eligible_completed_order_count: int
    basket_order_count: int
    eligible_basket_order_count: int
    skipped_oversized_order_count: int
    max_products_per_basket: int
    minimum_pair_order_count: int
    minimum_support_percent: float
    observed_pair_count: int
    qualified_pair_count: int
    rules: list[ProductAssociationRule]


class ProductIntelligence(StrictContractModel):
    abc: ABCAnalysis
    associations: ProductAssociationAnalysis


class ProductDiscountMetric(StrictContractModel):
    product_id: str
    product_name: str
    category: str
    gross_revenue: float
    discount_amount: float
    net_revenue: float
    discount_rate_percent: float
    order_count: int


class CategoryDiscountMetric(StrictContractModel):
    category: str
    gross_revenue: float
    discount_amount: float
    net_revenue: float
    discount_rate_percent: float
    order_count: int


class DiscountAnalysis(StrictContractModel):
    available: bool
    reason: Literal["NO_DISCOUNT_DATA"] | None
    gross_revenue: float
    discount_amount: float
    net_revenue: float
    discount_rate_percent: float
    discounted_order_count: int
    discounted_order_rate_percent: float
    by_product: list[ProductDiscountMetric]
    by_category: list[CategoryDiscountMetric]


class SalesAnalytics(StrictContractModel):
    gross_revenue: float
    total_discount: float
    discount_rate_percent: float
    revenue_by_month: list[RevenueMonthMetric]
    revenue_by_weekday: list[WeekdayRevenueMetric]
    revenue_by_category: list[CategoryMetric]
    top_products_by_revenue: list[ProductMetric]
    top_products_by_quantity: list[ProductMetric]
    lowest_quantity_products: list[ProductMetric]
    peak_revenue_day: RevenueDayMetric | None
    lowest_nonzero_revenue_day: RevenueDayMetric | None
    concentration: RevenueConcentration
    product_intelligence: ProductIntelligence
    discount_analysis: DiscountAnalysis


class CustomerSegments(StrictContractModel):
    new: int
    returning: int
    vip: int


class CustomerMetric(StrictContractModel):
    customer_id: str
    customer_name: str
    revenue: float
    order_count: int
    quantity: int
    first_order_date: date
    last_order_date: date
    segment: Literal["new", "returning", "vip"]


class SegmentRevenueMetric(StrictContractModel):
    segment: Literal["new", "returning", "vip"]
    customer_count: int
    revenue: float
    revenue_share_percent: float


class RFMSegments(StrictContractModel):
    new: int
    champion: int
    loyal: int
    at_risk: int
    regular: int


class RFMSegmentRevenueMetric(StrictContractModel):
    segment: Literal["new", "champion", "loyal", "at_risk", "regular"]
    customer_count: int
    revenue: float
    revenue_share_percent: float


class RFMCustomerMetric(StrictContractModel):
    customer_id: str
    customer_name: str
    recency_days: int
    frequency: int
    monetary: float
    recency_score: int
    frequency_score: int
    monetary_score: int
    total_score: int
    segment: Literal["new", "champion", "loyal", "at_risk", "regular"]


class RFMAnalysis(StrictContractModel):
    available: bool
    reason: Literal["INSUFFICIENT_CUSTOMERS"] | None
    snapshot_date: date
    customer_count: int
    minimum_customers: int
    score_scale: int
    scoring_method: Literal["empirical_quintile_average_rank"]
    segment_rules_version: Literal["rfm_v1"]
    segments: RFMSegments
    segment_revenue: list[RFMSegmentRevenueMetric]
    top_customers: list[RFMCustomerMetric]
    at_risk_customers: list[RFMCustomerMetric]


class CohortPeriodMetric(StrictContractModel):
    month_index: int
    activity_month: str
    active_customers: int
    retention_percent: float
    revenue: float
    order_count: int


class CustomerCohort(StrictContractModel):
    cohort_month: str
    cohort_size: int
    periods: list[CohortPeriodMetric]


class CustomerCohortAnalysis(StrictContractModel):
    available: bool
    reason: Literal["INSUFFICIENT_COHORT_HISTORY"] | None
    method: Literal["acquisition_month_completed_orders"]
    period_from: str
    period_to: str
    observed_month_count: int
    minimum_month_count: int
    customer_count: int
    cohort_count: int
    maximum_observed_month_index: int
    cohorts: list[CustomerCohort]


class CustomerAnalytics(StrictContractModel):
    segments: CustomerSegments
    repeat_customer_count: int
    repeat_customer_rate_percent: float
    revenue_by_segment: list[SegmentRevenueMetric]
    potential_count: int
    potential_customers: list[CustomerMetric]
    top_customers: list[CustomerMetric]
    rfm: RFMAnalysis
    cohort_analysis: CustomerCohortAnalysis


class UploadSourceFile(StrictContractModel):
    file_name: str
    row_count: int


class UploadMetadata(StrictContractModel):
    mode: Literal["single", "combined"]
    file_count: int
    source_files: list[UploadSourceFile]
    source_row_count: int
    effective_row_count: int
    duplicate_order_count: int
    duplicate_row_count: int


ForecastMethod = Literal[
    "seasonal_naive_7_days",
    "moving_average_7_days",
    "weekday_average_4_weeks",
    "linear_trend_30_days",
]


class ForecastPoint(StrictContractModel):
    date: date
    predicted_revenue: int
    lower_bound: int | None
    upper_bound: int | None


class ForecastErrorMetrics(StrictContractModel):
    mae: float
    rmse: float
    smape_percent: float


class ForecastEvaluationFold(StrictContractModel):
    fold: int
    training_days: int
    train_end_date: date
    validation_from: date
    validation_to: date
    model_metrics: ForecastErrorMetrics
    baseline_metrics: ForecastErrorMetrics


class ForecastEvaluation(StrictContractModel):
    available: bool
    reason: Literal[
        "FORECAST_UNAVAILABLE",
        "INSUFFICIENT_SELECTION_HISTORY",
    ] | None
    strategy: Literal["rolling_origin_selected_method"]
    evaluated_method: ForecastMethod | None
    baseline_method: Literal["seasonal_naive_7_days"]
    horizon_days: Literal[7]
    minimum_fold_count: Literal[2]
    maximum_fold_count: Literal[8]
    minimum_history_days: int
    fold_count: int
    evaluation_points: int
    model_metrics: ForecastErrorMetrics | None
    baseline_metrics: ForecastErrorMetrics | None
    mae_improvement_vs_baseline_percent: float | None
    reliability: Literal["high", "medium", "low", "unavailable"]
    folds: list[ForecastEvaluationFold]


class ForecastCandidate(StrictContractModel):
    rank: int
    method: ForecastMethod
    minimum_training_days: int
    metrics: ForecastErrorMetrics


class ForecastSelection(StrictContractModel):
    available: bool
    reason: Literal["INSUFFICIENT_SELECTION_HISTORY"] | None
    strategy: Literal["rolling_origin_candidate_comparison"]
    primary_metric: Literal["mae"]
    simplicity_tolerance_percent: Literal[5.0]
    minimum_fold_count: Literal[2]
    maximum_fold_count: Literal[8]
    minimum_history_days: Literal[28]
    fold_count: int
    evaluation_points: int
    selected_method: ForecastMethod | None
    selection_reason: Literal[
        "LOWEST_MAE",
        "SIMPLER_WITHIN_FIVE_PERCENT",
    ] | None
    candidates: list[ForecastCandidate]


class ForecastUncertainty(StrictContractModel):
    available: bool
    reason: Literal[
        "MODEL_SELECTION_UNAVAILABLE",
        "INSUFFICIENT_RESIDUALS",
    ] | None
    method: Literal["empirical_absolute_error_quantile"]
    target_coverage_percent: Literal[80]
    residual_count: int
    absolute_error_quantile: int | None
    observed_backtest_coverage_percent: float | None


class ForecastResult(StrictContractModel):
    available: bool
    method: ForecastMethod | None
    history_days: int
    forecast_days: int
    forecast_total: int | None
    change_vs_last_7_days_percent: float | None
    points: list[ForecastPoint]
    selection: ForecastSelection
    evaluation: ForecastEvaluation
    uncertainty: ForecastUncertainty
    disclaimer: str


class ReportEvidence(StrictContractModel):
    metric_key: str = Field(min_length=3, max_length=160)
    label: str = Field(min_length=2, max_length=160)
    value: int | float | str
    unit: Literal["vnd", "count", "percent", "days", "ratio", "label"]
    context: str | None = Field(default=None, max_length=200)


class ReportGeneratorMetadata(StrictContractModel):
    provider: Literal["rules", "gemini", "openai"]
    model: str | None = Field(default=None, max_length=160)


class ReportDataQualitySignal(StrictContractModel):
    code: str = Field(min_length=3, max_length=100)
    severity: Literal["info", "warning"]
    message: str = Field(min_length=10, max_length=600)
    evidence: list[ReportEvidence] = Field(min_length=1, max_length=3)


class ReportDataQuality(StrictContractModel):
    status: Literal["good", "attention"]
    summary: str = Field(min_length=10, max_length=800)
    signals: list[ReportDataQualitySignal] = Field(max_length=10)
    warning_codes: list[str] = Field(max_length=20)


class ReportSection(StrictContractModel):
    key: Literal["revenue", "products", "customers", "forecast"]
    title: str = Field(min_length=3, max_length=120)
    narrative: str = Field(min_length=10, max_length=1_500)
    evidence: list[ReportEvidence] = Field(min_length=1, max_length=5)


class ReportRiskSignal(StrictContractModel):
    code: str = Field(min_length=3, max_length=100)
    severity: Literal["info", "warning", "critical"]
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=10, max_length=800)
    evidence: list[ReportEvidence] = Field(min_length=1, max_length=3)


class ReportRecommendation(StrictContractModel):
    priority: Literal["high", "medium", "low"]
    title: str = Field(min_length=3, max_length=160)
    evidence: list[ReportEvidence] = Field(min_length=1, max_length=3)
    action: str = Field(min_length=10, max_length=1_000)
    success_metric: str = Field(min_length=10, max_length=600)


class ReportContent(StrictContractModel):
    report_version: Literal["2.0"]
    source: Literal["rule_based", "ai"]
    language: Literal["en", "vi"]
    generated_at: datetime
    generator: ReportGeneratorMetadata
    title: str = Field(min_length=3, max_length=160)
    executive_summary: str = Field(min_length=20, max_length=1_500)
    kpi_snapshot: list[ReportEvidence] = Field(min_length=4, max_length=6)
    data_quality: ReportDataQuality
    sections: list[ReportSection] = Field(min_length=4, max_length=4)
    risk_signals: list[ReportRiskSignal] = Field(max_length=5)
    recommendations: list[ReportRecommendation] = Field(
        min_length=1,
        max_length=5,
    )
    disclaimer: str = Field(min_length=10, max_length=800)

    @model_validator(mode="after")
    def validate_section_order(self) -> "ReportContent":
        expected = ["revenue", "products", "customers", "forecast"]
        actual = [section.key for section in self.sections]
        if actual != expected:
            raise ValueError(
                "Report sections must use the required order."
            )
        return self


class AnalysisDetailResponse(StrictContractModel):
    contract_version: Literal["3.0"]
    id: UUID
    file_name: str
    upload_mode: Literal["single", "combined"] = "single"
    source_file_count: int = 1
    status: Literal["processing", "completed", "failed"]
    row_count: int
    created_at: datetime
    period: AnalysisPeriod
    summary: AnalysisSummary
    orders: OrderAnalytics
    revenue_by_date: list[RevenueDayMetric]
    sales: SalesAnalytics
    customers: CustomerAnalytics
    forecast: ForecastResult
    report: ReportContent
    reports: dict[Literal["en", "vi"], ReportContent]
    upload: UploadMetadata
    warnings: list[str]


class AIReportWarning(BaseModel):
    code: str
    message: str


class AIReportGenerationResponse(BaseModel):
    analysis_id: UUID
    source: Literal["rule_based", "ai"]
    report: ReportContent
    language: Literal["en", "vi"]
    warning: AIReportWarning | None = None
