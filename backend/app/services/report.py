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
        "This report is based only on aggregate metrics derived from the "
        "uploaded data. Forecast intervals are empirical and the report does "
        "not replace professional financial or business advice."
    ),
    "vi": (
        "Báo cáo chỉ dựa trên các chỉ số tổng hợp từ dữ liệu đã tải lên. "
        "Khoảng dự báo mang tính thực nghiệm và báo cáo không thay thế tư vấn "
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
        "en": "Product intelligence",
        "vi": "Phân tích sản phẩm",
    },
    "customers": {
        "en": "Customer health",
        "vi": "Sức khỏe khách hàng",
    },
    "forecast": {
        "en": "Forecast evidence",
        "vi": "Bằng chứng dự báo",
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
        str(top_products[0].get("product_name") or "")
        if top_products
        else _text(language, "the leading product", "sản phẩm dẫn đầu")
    )
    growth = summary.get("growth_rate_percent")
    executive_summary = _executive_summary(
        language=language,
        summary=summary,
        growth=growth,
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
                    "sales.association.top_rule_lift",
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
                    "forecast.forecast_total",
                    "forecast.change_vs_last_7_days_percent",
                    "forecast.evaluation.mae",
                    "forecast.evaluation.reliability",
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
            "Evidence-based business report",
            "Báo cáo kinh doanh dựa trên bằng chứng",
        ),
        "executive_summary": executive_summary,
        "kpi_snapshot": _evidence(
            catalog,
            [
                "summary.total_revenue",
                "summary.total_orders",
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
) -> str:
    revenue = _format_number(summary.get("total_revenue", 0), language)
    orders = _format_number(summary.get("total_orders", 0), language)
    customers = _format_number(summary.get("total_customers", 0), language)
    base = (
        f"The period generated {revenue} VND from {orders} completed orders "
        f"and {customers} customers."
        if language == "en"
        else (
            f"Trong kỳ, cửa hàng ghi nhận {revenue} VND từ {orders} đơn hoàn "
            f"tất và {customers} khách hàng."
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
    if language == "vi":
        association_text = (
            " Có luật kết hợp đủ support để xem xét thử nghiệm bán kèm; lift "
            "không chứng minh quan hệ nhân quả."
            if has_association
            else " Chưa có luật kết hợp đủ ngưỡng support để diễn giải."
        )
        return (
            f"{product_name} là sản phẩm dẫn đầu theo doanh thu trong kỳ."
            f"{association_text}"
        )
    association_text = (
        " A supported association rule is available for a bundling test; "
        "lift does not establish causality."
        if has_association
        else " No association rule met the documented support threshold."
    )
    return (
        f"{product_name} is the leading product by period revenue."
        f"{association_text}"
    )


def _customer_narrative(
    *,
    language: ReportLanguage,
    customers: dict[str, Any],
    catalog: EvidenceCatalog,
) -> str:
    repeat_rate = float(customers.get("repeat_customer_rate_percent") or 0)
    cohort_available = (
        "customers.cohort.latest_m1_retention_percent" in catalog
    )
    if language == "vi":
        cohort_text = (
            " Cohort đã đủ lịch sử để theo dõi retention tháng 1."
            if cohort_available
            else " Cohort chưa đủ lịch sử quan sát cho một kết luận retention."
        )
        return (
            "Tỷ lệ khách hàng quay lại trong kỳ là "
            f"{_format_decimal(repeat_rate, language)}%."
            f"{cohort_text}"
        )
    cohort_text = (
        " Cohort history supports an observed month-1 retention metric."
        if cohort_available
        else " Cohort history is not yet sufficient for a retention conclusion."
    )
    return f"The period repeat-customer rate is {repeat_rate:.1f}%.{cohort_text}"


def _forecast_narrative(
    *,
    language: ReportLanguage,
    forecast: dict[str, Any],
) -> str:
    if not forecast.get("available"):
        return _text(
            language,
            "Fewer than 14 calendar days are available, so no forecast is published.",
            "Có dưới 14 ngày lịch sử nên hệ thống chưa công bố dự báo.",
        )
    evaluation = forecast.get("evaluation") or {}
    uncertainty = forecast.get("uncertainty") or {}
    if not evaluation.get("available"):
        return _text(
            language,
            "A 7-day fallback forecast is available, but history is insufficient for model comparison.",
            "Đã có dự báo fallback 7 ngày nhưng lịch sử chưa đủ để so sánh mô hình.",
        )
    reliability = str(evaluation.get("reliability") or "unavailable")
    interval_text = (
        _text(
            language,
            " An empirical 80% interval is available.",
            " Đã có khoảng bất định thực nghiệm mục tiêu 80%.",
        )
        if uncertainty.get("available")
        else _text(
            language,
            " There are not yet enough residuals for an uncertainty interval.",
            " Chưa đủ residual để tạo khoảng bất định.",
        )
    )
    return (
        _text(
            language,
            f"The selected method has {reliability} backtest reliability.",
            f"Phương pháp được chọn có mức reliability backtest là {reliability}.",
        )
        + interval_text
    )


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
            else "Không phát hiện lỗi chất lượng dữ liệu cản trở sau validation."
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
    if repeat_rate < 25:
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
    evaluation = forecast.get("evaluation") or {}
    if evaluation.get("available") and evaluation.get("reliability") == "low":
        risks.append(
            {
                "code": "LOW_FORECAST_RELIABILITY",
                "severity": "info",
                "title": _text(
                    language,
                    "Limited forecast evidence",
                    "Bằng chứng dự báo còn hạn chế",
                ),
                "description": _text(
                    language,
                    "Backtest reliability is low; use the forecast as a planning range, not a target.",
                    "Reliability backtest ở mức thấp; chỉ nên dùng dự báo như một khoảng tham khảo.",
                ),
                "evidence": _evidence(
                    catalog,
                    [
                        "forecast.evaluation.reliability",
                        "forecast.evaluation.smape_percent",
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
    summary = analysis_result.get("summary") or {}
    customers = analysis_result.get("customers") or {}
    recommendations = []
    growth = summary.get("growth_rate_percent")
    if growth is not None and float(growth) < -5:
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
                    ["summary.growth_rate_percent"],
                ),
                "action": _text(
                    language,
                    "Compare product and category revenue for the latest two 7-day periods, then document the largest observed change.",
                    "So sánh doanh thu sản phẩm và danh mục giữa hai kỳ 7 ngày gần nhất, sau đó ghi nhận biến động lớn nhất.",
                ),
                "success_metric": _text(
                    language,
                    "Latest 7-day revenue growth returns to zero or above.",
                    "Tăng trưởng doanh thu 7 ngày gần nhất trở về mức từ 0% trở lên.",
                ),
            }
        )
    if "sales.association.top_rule_lift" in catalog:
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
                    "Run a time-boxed bundle test for the leading association and compare its pair-order share with the current baseline.",
                    "Thử nghiệm gói bán kèm có thời hạn cho luật kết hợp dẫn đầu và so sánh tỷ trọng đơn chứa cặp với baseline hiện tại.",
                ),
                "success_metric": _text(
                    language,
                    "Pair-order support increases without reducing net revenue per completed order.",
                    "Support của cặp tăng mà không làm giảm doanh thu thuần trên mỗi đơn hoàn tất.",
                ),
            }
        )
    repeat_rate = float(customers.get("repeat_customer_rate_percent") or 0)
    recommendations.append(
        {
            "priority": "high" if repeat_rate < 25 else "medium",
            "title": _text(
                language,
                "Track customer retention",
                "Theo dõi khả năng giữ chân khách hàng",
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
                "Review repeat rate and month-1 cohort retention after each new monthly upload.",
                "Theo dõi tỷ lệ quay lại và retention tháng 1 sau mỗi lần cập nhật dữ liệu tháng mới.",
            ),
            "success_metric": _text(
                language,
                "Repeat rate and observed month-1 retention improve versus the current analysis.",
                "Tỷ lệ quay lại và retention tháng 1 đã quan sát tăng so với analysis hiện tại.",
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
                "Theo dõi tỷ trọng doanh thu của sản phẩm dẫn đầu ở analysis tiếp theo và không giả định thứ hạng hiện tại sẽ kéo dài.",
            ),
            "success_metric": _text(
                language,
                "Net revenue remains stable while top-product concentration does not increase materially.",
                "Doanh thu thuần ổn định trong khi mức tập trung vào sản phẩm dẫn đầu không tăng đáng kể.",
            ),
        }
    )
    return [item for item in recommendations if item["evidence"]][:5]


def _numeric_value(catalog: EvidenceCatalog, key: str) -> float:
    evidence = catalog.get(key)
    if not evidence:
        return 0.0
    value = evidence.get("value")
    return float(value) if isinstance(value, (int, float)) else 0.0


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
