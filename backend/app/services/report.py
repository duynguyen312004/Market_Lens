from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Iterable

from backend.app.schemas.analysis import ReportContent
from backend.app.services.report_evidence import (
    EvidenceCatalog,
    build_report_evidence_catalog,
)
from backend.app.services.report_types import ReportLanguage


REPORT_DISCLAIMERS: dict[ReportLanguage, str] = {
    "en": (
        "This report uses summary figures from the uploaded data. Expected "
        "forecast ranges are estimated from past sales, and the report does "
        "not replace professional financial or business advice."
    ),
    "vi": (
        "Báo cáo sử dụng các số liệu tổng hợp từ dữ liệu đã tải lên. Khoảng "
        "doanh thu dự kiến được ước tính từ lịch sử bán hàng và không thay thế tư vấn "
        "tài chính hoặc kinh doanh chuyên nghiệp."
    ),
}
REPORT_DISCLAIMER = REPORT_DISCLAIMERS["en"]

SECTION_TITLES = {
    "revenue": {
        "en": "Revenue performance",
        "vi": "Hiệu quả doanh thu",
    },
    "products": {
        "en": "Product performance",
        "vi": "Phân tích sản phẩm",
    },
    "customers": {
        "en": "Customer overview",
        "vi": "Tổng quan khách hàng",
    },
    "forecast": {
        "en": "Revenue outlook",
        "vi": "Triển vọng doanh thu",
    },
}


def build_rule_based_report(
    analysis_result: dict[str, Any],
    language: ReportLanguage = "en",
) -> dict[str, Any]:
    catalog = build_report_evidence_catalog(analysis_result, language)
    summary = analysis_result.get("summary") or {}
    sales = analysis_result.get("sales") or {}
    customers = analysis_result.get("customers") or {}
    forecast = analysis_result.get("forecast") or {}

    top_products = sales.get("top_products_by_revenue") or []
    top_product_name = (
        _short_label(top_products[0].get("product_name"))
        if top_products
        else _text(language, "the leading product", "sản phẩm dẫn đầu")
    )
    growth = summary.get("growth_rate_percent")
    executive_summary = _executive_summary(
        language=language,
        summary=summary,
        growth=growth,
        customer_data_available=customers.get("available", True),
    )

    sections = [
        {
            "key": "revenue",
            "title": SECTION_TITLES["revenue"][language],
            "narrative": _revenue_narrative(
                language=language,
                summary=summary,
                sales=sales,
            ),
            "evidence": _evidence(
                catalog,
                [
                    "summary.total_revenue",
                    "summary.growth_rate_percent",
                    "sales.discount_rate_percent",
                ],
            ),
        },
        {
            "key": "products",
            "title": SECTION_TITLES["products"][language],
            "narrative": _product_narrative(
                language=language,
                product_name=top_product_name,
                catalog=catalog,
            ),
            "evidence": _evidence(
                catalog,
                [
                    "sales.top_product.revenue",
                    "sales.concentration.top_product_revenue_share_percent",
                    "sales.growth.month.product_increase.revenue_change",
                    "sales.growth.year.product_increase.revenue_change",
                    "sales.association.top_rule_lift",
                    "sales.product_order_issues.top.issue_rate_percent",
                ],
            ),
        },
        {
            "key": "customers",
            "title": SECTION_TITLES["customers"][language],
            "narrative": _customer_narrative(
                language=language,
                customers=customers,
                catalog=catalog,
            ),
            "evidence": _evidence(
                catalog,
                [
                    "customers.availability",
                    "customers.repeat_customer_rate_percent",
                    "customers.vip_count",
                    "customers.cohort.latest_m1_retention_percent",
                ],
            ),
        },
        {
            "key": "forecast",
            "title": SECTION_TITLES["forecast"][language],
            "narrative": _forecast_narrative(
                language=language,
                forecast=forecast,
            ),
            "evidence": _evidence(
                catalog,
                [
                    "forecast.h7.forecast_total",
                    "forecast.h30.forecast_total",
                    "forecast.h30.change_vs_previous_period_percent",
                    "forecast.h30.evaluation.reliability",
                    "forecast.history_days",
                ],
            ),
        },
    ]

    report = {
        "report_version": "2.0",
        "source": "rule_based",
        "language": language,
        "generated_at": datetime.now(UTC).isoformat(),
        "generator": {
            "provider": "rules",
            "model": None,
        },
        "title": _text(
            language,
            "Business performance report",
            "Báo cáo tình hình kinh doanh",
        ),
        "executive_summary": executive_summary,
        "kpi_snapshot": _evidence(
            catalog,
            [
                "summary.total_revenue",
                "summary.total_orders",
                "summary.total_quantity_sold",
                "summary.total_customers",
                "summary.average_order_value",
                "summary.growth_rate_percent",
            ],
        ),
        "data_quality": _build_data_quality(
            analysis_result=analysis_result,
            catalog=catalog,
            language=language,
        ),
        "sections": sections,
        "risk_signals": _build_risk_signals(
            analysis_result=analysis_result,
            catalog=catalog,
            language=language,
        ),
        "recommendations": _build_recommendations(
            analysis_result=analysis_result,
            catalog=catalog,
            language=language,
            top_product_name=top_product_name,
        ),
        "disclaimer": REPORT_DISCLAIMERS[language],
    }
    return ReportContent.model_validate(report).model_dump(mode="json")


def hydrate_evidence(
    catalog: EvidenceCatalog,
    metric_keys: Iterable[str],
    *,
    minimum: int = 1,
    maximum: int = 5,
) -> list[dict[str, Any]]:
    keys = list(dict.fromkeys(metric_keys))
    if len(keys) < minimum or len(keys) > maximum:
        raise ValueError("Evidence reference count is outside the contract.")
    unknown = [key for key in keys if key not in catalog]
    if unknown:
        raise ValueError("The report references unknown evidence.")
    return [catalog[key] for key in keys]


def _evidence(
    catalog: EvidenceCatalog,
    keys: Iterable[str],
) -> list[dict[str, Any]]:
    return [catalog[key] for key in keys if key in catalog]


def _executive_summary(
    *,
    language: ReportLanguage,
    summary: dict[str, Any],
    growth: float | None,
    customer_data_available: bool,
) -> str:
    revenue = _format_number(summary.get("total_revenue", 0), language)
    orders = _format_number(summary.get("total_orders", 0), language)
    customers = _format_number(summary.get("total_customers", 0), language)
    if customer_data_available:
        base = (
            f"The period generated {revenue} VND from {orders} completed orders "
            f"and {customers} customers."
            if language == "en"
            else (
                f"Trong kỳ, cửa hàng ghi nhận {revenue} VND từ {orders} đơn hoàn "
                f"tất và {customers} khách hàng."
            )
        )
    else:
        base = (
            f"The period generated {revenue} VND from {orders} completed orders. "
            "Customer identifiers were not available."
            if language == "en"
            else (
                f"Trong kỳ, cửa hàng ghi nhận {revenue} VND từ {orders} đơn hoàn "
                "tất. File không có mã khách hàng để phân tích khách hàng."
            )
        )
    if growth is None:
        return base + _text(
            language,
            " A two-week revenue comparison is not yet available.",
            " Chưa đủ dữ liệu để so sánh doanh thu giữa hai kỳ 7 ngày.",
        )
    direction = (
        _text(language, "increased", "tăng")
        if growth > 0
        else _text(language, "decreased", "giảm")
        if growth < 0
        else _text(language, "was unchanged", "không đổi")
    )
    return (
        f"{base} "
        + (
            f"Latest 7-day revenue {direction} by "
            f"{_format_decimal(abs(growth), language)}%."
            if language == "en"
            else (
                f"Doanh thu 7 ngày gần nhất {direction} "
                f"{_format_decimal(abs(growth), language)}%."
            )
        )
    )


def _revenue_narrative(
    *,
    language: ReportLanguage,
    summary: dict[str, Any],
    sales: dict[str, Any],
) -> str:
    discount_rate = float(sales.get("discount_rate_percent") or 0)
    growth = summary.get("growth_rate_percent")
    if growth is None:
        trend = _text(
            language,
            "The history is too short for a two-period growth comparison.",
            "Lịch sử chưa đủ dài để so sánh tăng trưởng giữa hai kỳ.",
        )
    elif growth >= 0:
        trend = _text(
            language,
            "Recent revenue is stable or above the previous 7-day period.",
            "Doanh thu gần đây ổn định hoặc cao hơn kỳ 7 ngày trước.",
        )
    else:
        trend = _text(
            language,
            "Recent revenue is below the previous 7-day period.",
            "Doanh thu gần đây thấp hơn kỳ 7 ngày trước.",
        )
    return (
        f"{trend} "
        + _text(
            language,
            f"Observed discounts equal {discount_rate:.1f}% of gross revenue.",
            (
                "Giảm giá quan sát được chiếm "
                f"{_format_decimal(discount_rate, language)}% doanh thu gộp."
            ),
        )
    )


def _product_narrative(
    *,
    language: ReportLanguage,
    product_name: str,
    catalog: EvidenceCatalog,
) -> str:
    has_association = "sales.association.top_rule_lift" in catalog
    has_promising_association = (
        _numeric_value(
            catalog,
            "sales.association.top_rule_lift",
        )
        > 1
    )
    issue_evidence = catalog.get(
        "sales.product_order_issues.top.issue_rate_percent"
    )
    issue_text = ""
    growth_evidence = (
        catalog.get(
            "sales.growth.month.product_increase.revenue_change"
        )
        or catalog.get(
            "sales.growth.year.product_increase.revenue_change"
        )
    )
    growth_text = ""
    if growth_evidence:
        growth_product = str(growth_evidence.get("context") or "")
        growth_amount = _format_number(
            float(growth_evidence.get("value") or 0),
            language,
        )
        growth_text = _text(
            language,
            (
                f" {growth_product} made the largest observed positive "
                f"revenue contribution, increasing by {growth_amount} VND "
                "versus the preceding comparable period."
            ),
            (
                f" {growth_product} đóng góp mức tăng doanh thu lớn nhất, "
                f"tăng {growth_amount} VND so với kỳ liền trước có cùng "
                "độ dài."
            ),
        )
    if issue_evidence:
        issue_product = str(issue_evidence.get("context") or "")
        issue_rate = _format_decimal(
            float(issue_evidence.get("value") or 0),
            language,
        )
        issue_text = _text(
            language,
            (
                f" {issue_product} has the most notable cancelled or "
                f"returned order rate at {issue_rate}% among products "
                "with enough orders to compare."
            ),
            (
                f" {issue_product} có tỷ lệ đơn hủy hoặc trả đáng chú ý "
                f"nhất, ở mức {issue_rate}%, trong nhóm sản phẩm đủ số "
                "đơn để so sánh."
            ),
        )
    if language == "vi":
        association_text = (
            " Dữ liệu cho thấy một cặp sản phẩm xuất hiện cùng nhau nhiều hơn "
            "thông thường, phù hợp để thử nghiệm gói bán kèm ở quy mô nhỏ."
            if has_promising_association
            else (
                " Một số cặp sản phẩm đã lặp lại đủ để đo, nhưng chưa có cặp "
                "nào xuất hiện cùng nhau nhiều hơn thông thường."
                if has_association
                else (
                    " Chưa có cặp sản phẩm nào lặp lại đủ nhiều để đưa ra "
                    "gợi ý bán kèm."
                )
            )
        )
        return (
            f"{product_name} là sản phẩm dẫn đầu theo doanh thu trong kỳ."
            f"{growth_text}{association_text}{issue_text}"
        )
    association_text = (
        " The data shows a product pair appearing together more often than "
        "usual, making it suitable for a limited bundle test."
        if has_promising_association
        else (
            " Some product pairs repeat often enough to measure, but none "
            "appears together more often than usual."
            if has_association
            else (
                " No product combination repeats often enough for a "
                "reliable bundle suggestion yet."
            )
        )
    )
    return (
        f"{product_name} is the leading product by period revenue."
        f"{growth_text}{association_text}{issue_text}"
    )


def _customer_narrative(
    *,
    language: ReportLanguage,
    customers: dict[str, Any],
    catalog: EvidenceCatalog,
) -> str:
    if not customers.get("available", True):
        return _text(
            language,
            (
                "Customer analysis is unavailable because the file does not "
                "contain stable customer identifiers."
            ),
            (
                "Chưa thể phân tích khách hàng vì file không có mã khách hàng "
                "ổn định."
            ),
        )
    repeat_rate = float(customers.get("repeat_customer_rate_percent") or 0)
    cohort_available = (
        "customers.cohort.latest_m1_retention_percent" in catalog
    )
    if language == "vi":
        cohort_text = (
            " Dữ liệu đã đủ để theo dõi tỷ lệ khách quay lại sau tháng đầu tiên."
            if cohort_available
            else " Chưa đủ số tháng để đánh giá xu hướng khách quay lại dài hạn."
        )
        return (
            "Tỷ lệ khách hàng quay lại trong kỳ là "
            f"{_format_decimal(repeat_rate, language)}%."
            f"{cohort_text}"
        )
    cohort_text = (
        " There is enough history to measure returns after the first month."
        if cohort_available
        else " There are not enough months to assess longer-term customer returns."
    )
    return f"The period repeat-customer rate is {repeat_rate:.1f}%.{cohort_text}"


def _forecast_narrative(
    *,
    language: ReportLanguage,
    forecast: dict[str, Any],
) -> str:
    horizon_7 = _forecast_horizon(forecast, 7)
    horizon_30 = _forecast_horizon(forecast, 30)
    if not horizon_7 or not horizon_7.get("available"):
        return _text(
            language,
            "Fewer than 14 calendar days are available, so no forecast is published.",
            "Có dưới 14 ngày lịch sử nên hệ thống chưa công bố dự báo.",
        )
    focus = (
        horizon_30
        if horizon_30 and horizon_30.get("available")
        else horizon_7
    )
    evaluation = focus.get("evaluation") or {}
    reliability = str(evaluation.get("reliability") or "unavailable")
    reliability_label = {
        "high": _text(language, "high", "cao"),
        "medium": _text(language, "medium", "trung bình"),
        "low": _text(language, "low", "thấp"),
    }.get(reliability, _text(language, "not yet available", "chưa xác định"))
    uncertainty = focus.get("uncertainty") or {}
    interval_text = (
        _text(
            language,
            " An expected revenue range is also available.",
            " Báo cáo cũng đã có khoảng doanh thu dự kiến.",
        )
        if uncertainty.get("total_interval_available")
        else _text(
            language,
            " More history is needed to show an expected revenue range.",
            " Cần thêm dữ liệu để hiển thị khoảng doanh thu dự kiến.",
        )
    )
    forecast_parts = [
        _text(
            language,
            (
                "Expected revenue for the next 7 days is "
                f"{_format_number(horizon_7.get('forecast_total') or 0, language)} VND."
            ),
            (
                "Doanh thu dự báo 7 ngày tới là "
                f"{_format_number(horizon_7.get('forecast_total') or 0, language)} VND."
            ),
        )
    ]
    if horizon_30 and horizon_30.get("available"):
        forecast_parts.append(
            _text(
                language,
                (
                    "Expected revenue for the next 30 days is "
                    f"{_format_number(horizon_30.get('forecast_total') or 0, language)} VND."
                ),
                (
                    "Doanh thu dự báo 30 ngày tới là "
                    f"{_format_number(horizon_30.get('forecast_total') or 0, language)} VND."
                ),
            )
        )
    if evaluation.get("available"):
        forecast_parts.append(
            _text(
                language,
                (
                    "The selected calculation has "
                    f"{reliability_label} reliability."
                ),
                (
                    "Cách tính được chọn có độ tin cậy "
                    f"{reliability_label}."
                ),
            )
            + interval_text
        )
    else:
        forecast_parts.append(
            _text(
                language,
                (
                    "This is a basic forecast; more history is needed to "
                    "compare calculation methods."
                ),
                (
                    "Đây là dự báo cơ bản; cần thêm dữ liệu để so sánh "
                    "nhiều cách tính."
                ),
            )
            + interval_text
        )
    return " ".join(forecast_parts)


def _build_data_quality(
    *,
    analysis_result: dict[str, Any],
    catalog: EvidenceCatalog,
    language: ReportLanguage,
) -> dict[str, Any]:
    completion_rate = _numeric_value(
        catalog,
        "orders.completion_rate_percent",
    )
    duplicate_count = int(
        _numeric_value(catalog, "upload.duplicate_order_count")
    )
    signals = []
    if completion_rate < 90:
        signals.append(
            {
                "code": "LOW_COMPLETION_RATE",
                "severity": "warning",
                "message": _text(
                    language,
                    "The completed-order rate is below 90%; cancelled and returned orders are excluded from revenue.",
                    "Tỷ lệ đơn hoàn tất dưới 90%; đơn hủy và đơn trả không được tính vào doanh thu.",
                ),
                "evidence": _evidence(
                    catalog,
                    ["orders.completion_rate_percent"],
                ),
            }
        )
    if duplicate_count > 0:
        signals.append(
            {
                "code": "DUPLICATE_ORDERS_REMOVED",
                "severity": "info",
                "message": _text(
                    language,
                    "Exact duplicate orders were removed before analysis.",
                    "Các đơn trùng hoàn toàn đã được loại trước khi phân tích.",
                ),
                "evidence": _evidence(
                    catalog,
                    ["upload.duplicate_order_count"],
                ),
            }
        )
    status = "attention" if any(
        signal["severity"] == "warning" for signal in signals
    ) else "good"
    summary = _text(
        language,
        (
            "Some data-quality or order-status conditions need attention."
            if status == "attention"
            else "No blocking data-quality issue was detected after validation."
        ),
        (
            "Có điều kiện chất lượng dữ liệu hoặc trạng thái đơn cần lưu ý."
            if status == "attention"
            else "Không phát hiện vấn đề dữ liệu nghiêm trọng sau khi kiểm tra."
        ),
    )
    return {
        "status": status,
        "summary": summary,
        "signals": signals,
        "warning_codes": list(analysis_result.get("warnings") or []),
    }


def _build_risk_signals(
    *,
    analysis_result: dict[str, Any],
    catalog: EvidenceCatalog,
    language: ReportLanguage,
) -> list[dict[str, Any]]:
    summary = analysis_result.get("summary") or {}
    customers = analysis_result.get("customers") or {}
    sales = analysis_result.get("sales") or {}
    forecast = analysis_result.get("forecast") or {}
    risks = []
    growth = summary.get("growth_rate_percent")
    if growth is not None and float(growth) < -5:
        risks.append(
            {
                "code": "RECENT_REVENUE_DECLINE",
                "severity": "warning",
                "title": _text(
                    language,
                    "Recent revenue decline",
                    "Doanh thu gần đây suy giảm",
                ),
                "description": _text(
                    language,
                    "Latest 7-day revenue is more than 5% below the previous period.",
                    "Doanh thu 7 ngày gần nhất thấp hơn kỳ trước trên 5%.",
                ),
                "evidence": _evidence(
                    catalog,
                    ["summary.growth_rate_percent"],
                ),
            }
        )
    concentration = _numeric_value(
        catalog,
        "sales.concentration.top_product_revenue_share_percent",
    )
    if concentration >= 40:
        risks.append(
            {
                "code": "TOP_PRODUCT_CONCENTRATION",
                "severity": "warning",
                "title": _text(
                    language,
                    "Revenue concentration",
                    "Doanh thu tập trung",
                ),
                "description": _text(
                    language,
                    "A single product contributes at least 40% of period revenue.",
                    "Một sản phẩm đóng góp ít nhất 40% doanh thu trong kỳ.",
                ),
                "evidence": _evidence(
                    catalog,
                    [
                        "sales.concentration.top_product_revenue_share_percent"
                    ],
                ),
            }
        )
    repeat_rate = float(customers.get("repeat_customer_rate_percent") or 0)
    if customers.get("available", True) and repeat_rate < 25:
        risks.append(
            {
                "code": "LOW_REPEAT_RATE",
                "severity": "warning",
                "title": _text(
                    language,
                    "Low repeat-customer rate",
                    "Tỷ lệ khách quay lại thấp",
                ),
                "description": _text(
                    language,
                    "Fewer than one in four customers placed multiple completed orders.",
                    "Dưới một phần tư khách hàng có nhiều hơn một đơn hoàn tất.",
                ),
                "evidence": _evidence(
                    catalog,
                    ["customers.repeat_customer_rate_percent"],
                ),
            }
        )
    product_order_issues = sales.get("product_order_issues") or {}
    issue_products = product_order_issues.get("products") or []
    if issue_products:
        top_issue_product = issue_products[0]
        issue_rate = float(
            top_issue_product.get("issue_rate_percent") or 0
        )
        issue_count = int(
            top_issue_product.get("issue_order_count") or 0
        )
        if issue_rate >= 10 and issue_count >= 3:
            risks.append(
                {
                    "code": "PRODUCT_ORDER_ISSUES",
                    "severity": "warning",
                    "title": _text(
                        language,
                        "Product cancellations or returns need review",
                        "Sản phẩm có nhiều đơn hủy hoặc trả",
                    ),
                    "description": _text(
                        language,
                        (
                            "One product has a notable cancelled or "
                            "returned order rate among products with enough "
                            "orders to compare."
                        ),
                        (
                            "Một sản phẩm có tỷ lệ đơn hủy hoặc trả đáng "
                            "chú ý trong nhóm sản phẩm đủ số đơn để so sánh."
                        ),
                    ),
                    "evidence": _evidence(
                        catalog,
                        [
                            "sales.product_order_issues.top.issue_rate_percent",
                            "sales.product_order_issues.top.issue_order_count",
                        ],
                    ),
                }
            )
    forecast_30 = _forecast_horizon(forecast, 30)
    forecast_focus = (
        forecast_30
        if forecast_30 and forecast_30.get("available")
        else (_forecast_horizon(forecast, 7) or {})
    )
    evaluation = forecast_focus.get("evaluation") or {}
    horizon_days = int(forecast_focus.get("horizon_days") or 7)
    if evaluation.get("available") and evaluation.get("reliability") == "low":
        risks.append(
            {
                "code": "LOW_FORECAST_RELIABILITY",
                "severity": "info",
                "title": _text(
                    language,
                    "Forecast reliability is limited",
                    "Dự báo có độ tin cậy thấp",
                ),
                "description": _text(
                    language,
                    "Historical tests show limited reliability; use the forecast as a planning reference, not a sales target.",
                    "Kết quả thử trên dữ liệu cũ có độ tin cậy thấp; chỉ nên dùng dự báo để tham khảo khi lên kế hoạch.",
                ),
                "evidence": _evidence(
                    catalog,
                    [
                        f"forecast.h{horizon_days}.evaluation.reliability",
                        f"forecast.h{horizon_days}.evaluation.smape_percent",
                    ],
                ),
            }
        )
    return risks[:5]


def _build_recommendations(
    *,
    analysis_result: dict[str, Any],
    catalog: EvidenceCatalog,
    language: ReportLanguage,
    top_product_name: str,
) -> list[dict[str, Any]]:
    customers = analysis_result.get("customers") or {}
    sales = analysis_result.get("sales") or {}
    recommendations = []
    growth_drivers = sales.get("growth_drivers") or {}
    growth_period = _preferred_growth_period(growth_drivers)
    growth = (growth_period or {}).get("growth_rate_percent")
    if growth is not None and float(growth) < -5:
        comparison_type = str(
            (growth_period or {}).get("comparison_type") or "month"
        )
        growth_key = (
            f"sales.growth.{comparison_type}.growth_rate_percent"
        )
        decline_key = (
            f"sales.growth.{comparison_type}."
            "product_decrease.revenue_change"
        )
        decline_evidence = catalog.get(decline_key)
        decline_name = str(
            (decline_evidence or {}).get("context") or ""
        )
        recommendations.append(
            {
                "priority": "high",
                "title": _text(
                    language,
                    "Investigate the recent revenue decline",
                    "Rà soát đợt giảm doanh thu gần đây",
                ),
                "evidence": _evidence(
                    catalog,
                    [growth_key, decline_key],
                ),
                "action": _text(
                    language,
                    (
                        f"Review {decline_name}'s sales activity in the "
                        f"latest {comparison_type} comparison and check "
                        "whether lower order volume or units sold explains "
                        "the observed decline."
                        if decline_name
                        else (
                            "Review the largest product revenue decrease "
                            "against order volume and units sold."
                        )
                    ),
                    (
                        f"Rà soát hoạt động bán của {decline_name} trong kỳ "
                        "so sánh theo "
                        f"{'tháng' if comparison_type == 'month' else 'năm'} "
                        "và kiểm tra mức "
                        "giảm đến từ số đơn hay số lượng bán."
                        if decline_name
                        else (
                            "Rà soát sản phẩm giảm doanh thu nhiều nhất "
                            "theo số đơn và số lượng bán."
                        )
                    ),
                ),
                "success_metric": _text(
                    language,
                    (
                        f"Revenue growth in the {comparison_type} "
                        "comparison returns to zero or above."
                    ),
                    (
                        "Tăng trưởng doanh thu theo "
                        f"{'tháng' if comparison_type == 'month' else 'năm'} "
                        "trở về mức từ 0% trở lên."
                    ),
                ),
            }
        )
    if (
        _numeric_value(
            catalog,
            "sales.association.top_rule_lift",
        )
        > 1
    ):
        recommendations.append(
            {
                "priority": "medium",
                "title": _text(
                    language,
                    "Test a product bundle",
                    "Thử nghiệm gói sản phẩm",
                ),
                "evidence": _evidence(
                    catalog,
                    [
                        "sales.association.top_rule_lift",
                        "sales.association.top_rule_confidence_percent",
                        "sales.association.top_rule_support_percent",
                    ],
                ),
                "action": _text(
                    language,
                    "Try a limited-time bundle for the leading product combination and compare how often both products appear in an order.",
                    "Thử gói bán kèm có thời hạn cho cặp sản phẩm nổi bật và so sánh tỷ lệ đơn có cả hai sản phẩm trước và sau thử nghiệm.",
                ),
                "success_metric": _text(
                    language,
                    "The share of orders containing both products increases without reducing average completed-order revenue.",
                    "Tỷ lệ đơn có cả hai sản phẩm tăng mà không làm giảm doanh thu trung bình trên mỗi đơn hoàn tất.",
                ),
            }
        )
    product_order_issues = sales.get("product_order_issues") or {}
    issue_products = product_order_issues.get("products") or []
    if issue_products:
        top_issue_product = issue_products[0]
        issue_rate = float(
            top_issue_product.get("issue_rate_percent") or 0
        )
        issue_count = int(
            top_issue_product.get("issue_order_count") or 0
        )
        if issue_rate >= 10 and issue_count >= 3:
            product_name = _short_label(
                top_issue_product.get("product_name")
            )
            recommendations.append(
                {
                    "priority": "high",
                    "title": _text(
                        language,
                        f"Review cancellations and returns for {product_name}",
                        f"Rà soát đơn hủy và trả của {product_name}",
                    ),
                    "evidence": _evidence(
                        catalog,
                        [
                            "sales.product_order_issues.top.issue_rate_percent",
                            "sales.product_order_issues.top.affected_product_value",
                        ],
                    ),
                    "action": _text(
                        language,
                        (
                            "Review any available cancellation or return "
                            "reasons for this product, then check its listing, "
                            "packing, and fulfilment process for recurring "
                            "issues."
                        ),
                        (
                            "Đối chiếu lý do hủy hoặc trả nếu shop có dữ "
                            "liệu bổ sung, sau đó kiểm tra nội dung sản phẩm, "
                            "đóng gói và quy trình giao hàng để tìm vấn đề "
                            "lặp lại."
                        ),
                    ),
                    "success_metric": _text(
                        language,
                        (
                            "The product's cancelled or returned order rate "
                            "falls below the current report in the next "
                            "comparable period."
                        ),
                        (
                            "Tỷ lệ đơn hủy hoặc trả của sản phẩm giảm so với "
                            "báo cáo hiện tại trong kỳ tiếp theo có quy mô "
                            "tương đương."
                        ),
                    ),
                }
            )
    if customers.get("available", True):
        repeat_rate = float(
            customers.get("repeat_customer_rate_percent") or 0
        )
        recommendations.append(
            {
                "priority": "high" if repeat_rate < 25 else "medium",
                "title": _text(
                    language,
                    "Track returning customers",
                    "Theo dõi khách hàng quay lại",
                ),
                "evidence": _evidence(
                    catalog,
                    [
                        "customers.repeat_customer_rate_percent",
                        "customers.cohort.latest_m1_retention_percent",
                    ],
                ),
                "action": _text(
                    language,
                    "Review the repeat-customer rate and the share returning after one month whenever new monthly data is uploaded.",
                    "Theo dõi tỷ lệ khách mua lại và tỷ lệ quay lại sau một tháng mỗi khi cập nhật dữ liệu tháng mới.",
                ),
                "success_metric": _text(
                    language,
                    "Both measures improve compared with the current report.",
                    "Cả hai tỷ lệ đều cải thiện so với báo cáo hiện tại.",
                ),
            }
        )
    recommendations.append(
        {
            "priority": "medium",
            "title": _text(
                language,
                f"Protect {top_product_name}'s contribution",
                f"Duy trì đóng góp của {top_product_name}",
            ),
            "evidence": _evidence(
                catalog,
                [
                    "sales.top_product.revenue",
                    "sales.concentration.top_product_revenue_share_percent",
                ],
            ),
            "action": _text(
                language,
                "Track the leading product's revenue share in the next analysis and avoid assuming the current rank will persist.",
                "Theo dõi tỷ trọng doanh thu của sản phẩm dẫn đầu trong lần cập nhật tiếp theo; thứ hạng hiện tại có thể thay đổi.",
            ),
            "success_metric": _text(
                language,
                "Net revenue remains stable while top-product concentration does not increase materially.",
                "Doanh thu thuần ổn định trong khi mức tập trung vào sản phẩm dẫn đầu không tăng đáng kể.",
            ),
        }
    )
    return [item for item in recommendations if item["evidence"]][:5]


def _forecast_horizon(
    forecast: dict[str, Any],
    horizon_days: int,
) -> dict[str, Any] | None:
    return next(
        (
            horizon
            for horizon in forecast.get("horizons") or []
            if int(horizon.get("horizon_days") or 0) == horizon_days
        ),
        None,
    )


def _preferred_growth_period(
    growth_drivers: dict[str, Any],
) -> dict[str, Any] | None:
    preferred_type = str(
        growth_drivers.get("default_comparison_type") or "month"
    )
    preferred = next(
        (
            period
            for period in growth_drivers.get("periods") or []
            if str(period.get("comparison_type") or "")
            == preferred_type
            and period.get("available")
        ),
        None,
    )
    if preferred is not None:
        return preferred
    return next(
        (
            period
            for period in growth_drivers.get("periods") or []
            if period.get("available")
        ),
        None,
    )


def _numeric_value(catalog: EvidenceCatalog, key: str) -> float:
    evidence = catalog.get(key)
    if not evidence:
        return 0.0
    value = evidence.get("value")
    return float(value) if isinstance(value, (int, float)) else 0.0


def _short_label(value: Any, maximum_length: int = 96) -> str:
    normalized = " ".join(str(value or "").split())
    if len(normalized) <= maximum_length:
        return normalized
    return f"{normalized[: maximum_length - 1].rstrip()}…"


def _text(
    language: ReportLanguage,
    english: str,
    vietnamese: str,
) -> str:
    return vietnamese if language == "vi" else english


def _format_number(value: int | float, language: ReportLanguage) -> str:
    formatted = f"{value:,.0f}"
    return formatted.replace(",", ".") if language == "vi" else formatted


def _format_decimal(value: int | float, language: ReportLanguage) -> str:
    formatted = f"{value:.1f}"
    return formatted.replace(".", ",") if language == "vi" else formatted
