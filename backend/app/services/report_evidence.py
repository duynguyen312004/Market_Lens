from __future__ import annotations

from numbers import Integral, Real
from typing import Any

from backend.app.services.report_types import ReportLanguage


EvidenceCatalog = dict[str, dict[str, Any]]


def build_report_evidence_catalog(
    analysis_result: dict[str, Any],
    language: ReportLanguage,
) -> EvidenceCatalog:
    summary = analysis_result.get("summary") or {}
    orders = analysis_result.get("orders") or {}
    sales = analysis_result.get("sales") or {}
    customers = analysis_result.get("customers") or {}
    forecast = analysis_result.get("forecast") or {}
    upload = analysis_result.get("upload") or {}
    catalog: EvidenceCatalog = {}

    def add(
        metric_key: str,
        label_en: str,
        label_vi: str,
        value: Any,
        unit: str,
        *,
        context: str | None = None,
    ) -> None:
        if value is None:
            return
        catalog[metric_key] = {
            "metric_key": metric_key,
            "label": label_vi if language == "vi" else label_en,
            "value": _normalize_value(value),
            "unit": unit,
            "context": context,
        }

    add(
        "summary.total_revenue",
        "Total net revenue",
        "Tổng doanh thu thuần",
        summary.get("total_revenue"),
        "vnd",
    )
    add(
        "summary.total_orders",
        "Completed orders",
        "Đơn hàng hoàn tất",
        summary.get("total_orders"),
        "count",
    )
    add(
        "summary.total_customers",
        "Unique completed-order customers",
        "Khách hàng có đơn hoàn tất",
        summary.get("total_customers"),
        "count",
    )
    add(
        "summary.total_quantity_sold",
        "Units sold in completed orders",
        "Sản phẩm đã bán trong đơn hoàn tất",
        summary.get("total_quantity_sold"),
        "count",
    )
    add(
        "summary.average_order_value",
        "Average completed-order value",
        "Giá trị đơn hoàn tất trung bình",
        summary.get("average_order_value"),
        "vnd",
    )
    add(
        "summary.growth_rate_percent",
        "Latest 7-day revenue growth",
        "Tăng trưởng doanh thu 7 ngày gần nhất",
        summary.get("growth_rate_percent"),
        "percent",
    )

    status_rates = orders.get("status_rates_percent") or {}
    add(
        "orders.completion_rate_percent",
        "Order completion rate",
        "Tỷ lệ đơn hoàn tất",
        status_rates.get("completed"),
        "percent",
    )
    add(
        "orders.cancellation_rate_percent",
        "Order cancellation rate",
        "Tỷ lệ đơn hủy",
        status_rates.get("cancelled"),
        "percent",
    )
    add(
        "orders.return_rate_percent",
        "Order return rate",
        "Tỷ lệ đơn trả",
        status_rates.get("returned"),
        "percent",
    )
    add(
        "orders.average_items_per_completed_order",
        "Average units per completed order",
        "Số sản phẩm trung bình mỗi đơn hoàn tất",
        orders.get("average_items_per_completed_order"),
        "ratio",
    )

    add(
        "sales.gross_revenue",
        "Gross revenue before discounts",
        "Doanh thu gộp trước giảm giá",
        sales.get("gross_revenue"),
        "vnd",
    )
    add(
        "sales.discount_rate_percent",
        "Discount rate",
        "Tỷ lệ giảm giá",
        sales.get("discount_rate_percent"),
        "percent",
    )
    concentration = sales.get("concentration") or {}
    add(
        "sales.concentration.top_product_revenue_share_percent",
        "Top product revenue share",
        "Tỷ trọng doanh thu sản phẩm dẫn đầu",
        concentration.get("top_product_revenue_share_percent"),
        "percent",
    )
    add(
        "sales.concentration.top_category_revenue_share_percent",
        "Top category revenue share",
        "Tỷ trọng doanh thu danh mục dẫn đầu",
        concentration.get("top_category_revenue_share_percent"),
        "percent",
    )

    top_products = sales.get("top_products_by_revenue") or []
    if top_products:
        top_product = top_products[0]
        product_context = str(top_product.get("product_name") or "")
        add(
            "sales.top_product.revenue",
            "Top product revenue",
            "Doanh thu sản phẩm dẫn đầu",
            top_product.get("revenue"),
            "vnd",
            context=product_context,
        )
        add(
            "sales.top_product.quantity",
            "Top product units sold",
            "Số lượng bán của sản phẩm dẫn đầu",
            top_product.get("quantity"),
            "count",
            context=product_context,
        )
        add(
            "sales.top_product.order_count",
            "Top product completed orders",
            "Số đơn hoàn tất chứa sản phẩm dẫn đầu",
            top_product.get("order_count"),
            "count",
            context=product_context,
        )

    lowest_products = sales.get("lowest_quantity_products") or []
    if lowest_products:
        lowest_product = lowest_products[0]
        add(
            "sales.lowest_quantity_product.quantity",
            "Lowest observed product units sold",
            "Số lượng bán thấp nhất quan sát được",
            lowest_product.get("quantity"),
            "count",
            context=str(lowest_product.get("product_name") or ""),
        )

    categories = sales.get("revenue_by_category") or []
    if categories:
        top_category = categories[0]
        add(
            "sales.top_category.revenue_share_percent",
            "Top category revenue share",
            "Tỷ trọng doanh thu danh mục dẫn đầu",
            top_category.get("revenue_share_percent"),
            "percent",
            context=str(top_category.get("category") or ""),
        )

    product_intelligence = sales.get("product_intelligence") or {}
    associations = product_intelligence.get("associations") or {}
    association_rules = associations.get("rules") or []
    if association_rules:
        top_rule = association_rules[0]
        association_context = (
            f"{top_rule.get('source_product_name', '')} → "
            f"{top_rule.get('target_product_name', '')}"
        )
        add(
            "sales.association.top_rule_lift",
            "Leading relationship strength",
            "Mức liên quan của cặp sản phẩm nổi bật",
            top_rule.get("lift"),
            "ratio",
            context=association_context,
        )
        add(
            "sales.association.top_rule_confidence_percent",
            "Add-on likelihood",
            "Khả năng mua kèm",
            top_rule.get("confidence_percent"),
            "percent",
            context=association_context,
        )
        add(
            "sales.association.top_rule_support_percent",
            "Orders containing both products",
            "Tỷ lệ đơn có cả hai sản phẩm",
            top_rule.get("support_percent"),
            "percent",
            context=association_context,
        )

    segments = customers.get("segments") or {}
    add(
        "customers.repeat_customer_rate_percent",
        "Repeat customer rate",
        "Tỷ lệ khách hàng quay lại",
        customers.get("repeat_customer_rate_percent"),
        "percent",
    )
    add(
        "customers.vip_count",
        "VIP customers",
        "Khách hàng VIP",
        segments.get("vip"),
        "count",
    )
    rfm = customers.get("rfm") or {}
    rfm_segments = rfm.get("segments") or {}
    if rfm.get("available"):
        add(
            "customers.rfm.at_risk_count",
            "Customers needing attention",
            "Khách hàng cần được quan tâm",
            rfm_segments.get("at_risk"),
            "count",
        )
        add(
            "customers.rfm.champion_count",
            "Most engaged customers",
            "Khách hàng nổi bật nhất",
            rfm_segments.get("champion"),
            "count",
        )

    cohort = customers.get("cohort_analysis") or {}
    if cohort.get("available"):
        cohort_metric = _latest_observed_cohort_metric(
            cohort.get("cohorts") or [],
            month_index=1,
        )
        if cohort_metric is not None:
            cohort_month, period = cohort_metric
            add(
                "customers.cohort.latest_m1_retention_percent",
                "Customers returning after one month",
                "Tỷ lệ khách quay lại sau một tháng",
                period.get("retention_percent"),
                "percent",
                context=cohort_month,
            )

    add(
        "forecast.history_days",
        "Forecast history length",
        "Độ dài lịch sử dự báo",
        forecast.get("history_days")
        if forecast
        else (analysis_result.get("period") or {}).get("history_days"),
        "days",
    )
    add(
        "forecast.forecast_total",
        "Next 7-day forecast revenue",
        "Doanh thu dự báo 7 ngày tới",
        forecast.get("forecast_total"),
        "vnd",
    )
    add(
        "forecast.change_vs_last_7_days_percent",
        "Forecast change versus latest actual 7 days",
        "Thay đổi dự báo so với 7 ngày thực tế gần nhất",
        forecast.get("change_vs_last_7_days_percent"),
        "percent",
    )
    add(
        "forecast.selected_method",
        "Selected forecast method",
        "Phương pháp dự báo được chọn",
        _forecast_method_label(forecast.get("method"), language),
        "label",
    )
    evaluation = forecast.get("evaluation") or {}
    if evaluation.get("available"):
        model_metrics = evaluation.get("model_metrics") or {}
        add(
            "forecast.evaluation.mae",
            "Average daily forecast difference",
            "Sai lệch dự báo trung bình mỗi ngày",
            model_metrics.get("mae"),
            "vnd",
        )
        add(
            "forecast.evaluation.smape_percent",
            "Average percentage forecast difference",
            "Sai lệch dự báo tương đối trung bình",
            model_metrics.get("smape_percent"),
            "percent",
        )
        add(
            "forecast.evaluation.mae_improvement_vs_baseline_percent",
            "Improvement over a simple weekly estimate",
            "Mức cải thiện so với cách tính tuần đơn giản",
            evaluation.get("mae_improvement_vs_baseline_percent"),
            "percent",
        )
        add(
            "forecast.evaluation.reliability",
            "Forecast reliability",
            "Độ tin cậy dự báo",
            _reliability_label(evaluation.get("reliability"), language),
            "label",
        )
    uncertainty = forecast.get("uncertainty") or {}
    if uncertainty.get("available"):
        add(
            "forecast.uncertainty.observed_coverage_percent",
            "Expected-range coverage in historical tests",
            "Mức bao phủ của khoảng dự kiến trên dữ liệu cũ",
            uncertainty.get("observed_backtest_coverage_percent"),
            "percent",
        )
        add(
            "forecast.uncertainty.absolute_error_quantile",
            "Expected difference used for the revenue range",
            "Mức sai lệch dùng để tạo khoảng doanh thu dự kiến",
            uncertainty.get("absolute_error_quantile"),
            "vnd",
        )

    add(
        "upload.duplicate_order_count",
        "Duplicate orders removed",
        "Đơn trùng đã loại",
        upload.get("duplicate_order_count", 0),
        "count",
    )
    add(
        "data.warning_count",
        "Analysis warning count",
        "Số cảnh báo phân tích",
        len(analysis_result.get("warnings") or []),
        "count",
    )
    return catalog


def _latest_observed_cohort_metric(
    cohorts: list[dict[str, Any]],
    *,
    month_index: int,
) -> tuple[str, dict[str, Any]] | None:
    for cohort in reversed(cohorts):
        for period in cohort.get("periods") or []:
            if period.get("month_index") == month_index:
                return str(cohort.get("cohort_month") or ""), period
    return None


def _normalize_value(value: Any) -> int | float | str:
    if isinstance(value, Integral):
        return int(value)
    if isinstance(value, Real):
        return float(value)
    return str(value)


def _forecast_method_label(
    method: Any,
    language: ReportLanguage,
) -> str | None:
    labels = {
        "moving_average_7_days": {
            "en": "Average of the latest 7 days",
            "vi": "Trung bình 7 ngày gần nhất",
        },
        "seasonal_naive_7_days": {
            "en": "Same weekday as last week",
            "vi": "Theo cùng ngày của tuần trước",
        },
        "weekday_average_4_weeks": {
            "en": "Average by weekday over 4 weeks",
            "vi": "Trung bình theo thứ trong 4 tuần",
        },
        "linear_trend_30_days": {
            "en": "30-day revenue trend",
            "vi": "Xu hướng doanh thu trong 30 ngày",
        },
    }
    return labels.get(str(method), {}).get(language) if method else None


def _reliability_label(
    reliability: Any,
    language: ReportLanguage,
) -> str | None:
    labels = {
        "high": {"en": "High", "vi": "Cao"},
        "medium": {"en": "Medium", "vi": "Trung bình"},
        "low": {"en": "Low", "vi": "Thấp"},
        "unavailable": {"en": "Not available", "vi": "Chưa có"},
    }
    return (
        labels.get(str(reliability), {}).get(language)
        if reliability
        else None
    )
