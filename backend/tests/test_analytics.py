from datetime import date, timedelta
from pathlib import Path

import pandas as pd
import pytest

from backend.app.core.errors import AppError
from backend.app.services.analytics import calculate_analytics
from backend.app.services.analytics.product_intelligence import (
    calculate_discount_analysis,
    calculate_product_intelligence,
)
from backend.app.services.analytics.rfm import calculate_rfm
from backend.app.services.file_reader import read_sales_file
from backend.app.services.forecast import calculate_forecast
from backend.app.services.report import build_rule_based_report
from backend.app.services.validator import validate_sales_data


SAMPLE_PATH = Path("sample_data/sample_sales_demo_60_days.csv")


@pytest.fixture(scope="module")
def demo_analytics() -> dict:
    frame = read_sales_file(
        file_name=SAMPLE_PATH.name,
        content=SAMPLE_PATH.read_bytes(),
    )
    validated = validate_sales_data(frame, max_rows=50_000)
    return calculate_analytics(validated)


def test_demo_metrics_match_oracle(demo_analytics: dict) -> None:
    assert demo_analytics["contract_version"] == "3.0"
    summary = demo_analytics["summary"]
    assert summary == {
        "total_revenue": 113_010_000,
        "total_orders": 273,
        "total_customers": 30,
        "total_quantity_sold": 503,
        "growth_rate_percent": pytest.approx(37.201646),
        "average_order_value": 413_956.04,
        "average_revenue_per_customer": 3_767_000,
    }
    assert demo_analytics["customers"]["segments"] == {
        "new": 0,
        "returning": 27,
        "vip": 3,
    }
    assert [
        customer["customer_id"]
        for customer in demo_analytics["customers"]["potential_customers"]
    ] == ["C017", "C025", "C015", "C018", "C012", "C011"]

    top_product = demo_analytics["sales"]["top_products_by_revenue"][0]
    assert top_product == {
        "product_id": "P004",
        "product_name": "Tai nghe Bluetooth",
        "category": "Dien tu",
        "revenue": 31_560_000,
        "quantity": 65,
        "order_count": 45,
    }


def test_demo_advanced_metrics_match_oracle(
    demo_analytics: dict,
) -> None:
    assert demo_analytics["orders"] == {
        "total_orders_all_statuses": 313,
        "by_status": {
            "completed": 273,
            "cancelled": 27,
            "returned": 13,
        },
        "status_rates_percent": {
            "completed": pytest.approx(87.220447),
            "cancelled": pytest.approx(8.626198),
            "returned": pytest.approx(4.153355),
        },
        "average_items_per_completed_order": pytest.approx(1.842491),
    }

    sales = demo_analytics["sales"]
    assert sales["gross_revenue"] == 115_180_000
    assert sales["total_discount"] == 2_170_000
    assert sales["discount_rate_percent"] == pytest.approx(1.884008)
    assert sales["peak_revenue_day"] == {
        "date": "2026-05-21",
        "revenue": 4_430_000,
    }
    assert sales["lowest_nonzero_revenue_day"] == {
        "date": "2026-05-27",
        "revenue": 90_000,
    }
    assert sales["concentration"] == {
        "top_product_revenue_share_percent": pytest.approx(27.926732),
        "top_category_revenue_share_percent": pytest.approx(36.563136),
        "top_20_percent_product_count": 2,
        "top_20_percent_products_revenue_share_percent": pytest.approx(
            53.853641
        ),
    }
    assert len(sales["revenue_by_weekday"]) == 7
    friday = sales["revenue_by_weekday"][4]
    assert friday == {
        "weekday": "friday",
        "weekday_index": 4,
        "revenue": 22_580_000,
        "order_count": 50,
        "revenue_share_percent": pytest.approx(19.980533),
    }

    customers = demo_analytics["customers"]
    assert customers["repeat_customer_count"] == 30
    assert customers["repeat_customer_rate_percent"] == 100.0
    assert customers["revenue_by_segment"] == [
        {
            "segment": "new",
            "customer_count": 0,
            "revenue": 0,
            "revenue_share_percent": 0.0,
        },
        {
            "segment": "returning",
            "customer_count": 27,
            "revenue": 92_290_000,
            "revenue_share_percent": pytest.approx(81.665339),
        },
        {
            "segment": "vip",
            "customer_count": 3,
            "revenue": 20_720_000,
            "revenue_share_percent": pytest.approx(18.334661),
        },
    ]


def test_demo_e2_customer_and_product_intelligence_matches_oracle(
    demo_analytics: dict,
) -> None:
    rfm = demo_analytics["customers"]["rfm"]
    assert rfm["available"] is True
    assert rfm["snapshot_date"] == "2026-06-30"
    assert rfm["segments"] == {
        "new": 0,
        "champion": 5,
        "loyal": 10,
        "at_risk": 3,
        "regular": 12,
    }
    assert [
        customer["customer_id"]
        for customer in rfm["at_risk_customers"]
    ] == ["C015", "C018", "C022"]

    intelligence = demo_analytics["sales"]["product_intelligence"]
    assert intelligence["abc"]["classified_product_count"] == 6
    assert intelligence["abc"]["classes"] == {
        "A": {
            "product_count": 4,
            "revenue": 97_460_000,
            "revenue_share_percent": pytest.approx(86.240156),
        },
        "B": {
            "product_count": 2,
            "revenue": 15_550_000,
            "revenue_share_percent": pytest.approx(13.759844),
        },
        "C": {
            "product_count": 0,
            "revenue": 0,
            "revenue_share_percent": 0.0,
        },
    }
    associations = intelligence["associations"]
    assert associations["basket_order_count"] == 71
    assert associations["skipped_oversized_order_count"] == 0
    assert associations["rules"][0] == {
        "source_product_id": "P003",
        "source_product_name": "Binh nuoc",
        "target_product_id": "P001",
        "target_product_name": "Ao thun basic",
        "pair_order_count": 7,
        "source_order_count": 48,
        "target_order_count": 58,
        "support_percent": pytest.approx(2.564103),
        "confidence_percent": pytest.approx(14.583333),
        "lift": pytest.approx(0.686422),
    }
    assert demo_analytics["customers"]["cohort_analysis"]["available"] is False
    assert demo_analytics["customers"]["cohort_analysis"]["reason"] == (
        "INSUFFICIENT_COHORT_HISTORY"
    )

    discount = demo_analytics["sales"]["discount_analysis"]
    assert discount["discounted_order_count"] == 131
    assert discount["discounted_order_rate_percent"] == pytest.approx(
        47.985348
    )
    assert discount["by_product"][0]["product_id"] == "P006"
    assert discount["by_product"][0]["discount_amount"] == 500_000


def test_rfm_requires_a_minimum_customer_sample() -> None:
    frame = pd.DataFrame(
        [
            _normalized_row(
                order_id=f"DH{index:03}",
                customer_id=f"C{index:03}",
            )
            for index in range(1, 5)
        ]
    )

    result = calculate_rfm(frame)

    assert result["available"] is False
    assert result["reason"] == "INSUFFICIENT_CUSTOMERS"
    assert result["minimum_customers"] == 5
    assert result["top_customers"] == []


def test_rfm_ties_receive_the_same_score_and_sort_by_customer_id() -> None:
    frame = pd.DataFrame(
        [
            _normalized_row(
                order_id=f"DH{index:03}",
                customer_id=f"C{index:03}",
            )
            for index in range(1, 6)
        ]
    )

    result = calculate_rfm(frame)

    assert result["available"] is True
    assert [
        (
            customer["recency_score"],
            customer["frequency_score"],
            customer["monetary_score"],
        )
        for customer in result["top_customers"]
    ] == [(3, 3, 3)] * 5
    assert [
        customer["customer_id"] for customer in result["top_customers"]
    ] == ["C001", "C002", "C003", "C004", "C005"]


def test_rfm_is_deterministic_for_one_hundred_customers() -> None:
    rows = []
    start = pd.Timestamp("2026-01-01")
    for customer_number in range(1, 101):
        order_count = 1 + customer_number % 5
        for order_number in range(order_count):
            rows.append(
                _normalized_row(
                    order_id=f"DH{customer_number:03}-{order_number}",
                    customer_id=f"C{customer_number:03}",
                    order_date=start
                    + pd.Timedelta(
                        days=(customer_number * 3 + order_number) % 90
                    ),
                    line_revenue=50_000 + customer_number * 1_000,
                )
            )
    frame = pd.DataFrame(rows)

    first = calculate_rfm(frame)
    second = calculate_rfm(frame.sample(frac=1, random_state=42))

    assert sum(first["segments"].values()) == 100
    assert first == second


def test_abc_boundaries_include_the_threshold_crossing_product() -> None:
    product_rows = [
        _product_metric("P001", revenue=900),
        _product_metric("P002", revenue=50),
        _product_metric("P003", revenue=50),
    ]
    completed = pd.DataFrame(
        [
            _normalized_row(
                order_id=f"DH{index}",
                product_id=f"P00{index}",
            )
            for index in range(1, 4)
        ]
    )

    abc = calculate_product_intelligence(
        completed,
        product_rows,
    )["abc"]

    assert {
        item["product_id"]: item["abc_class"]
        for item in abc["representative_products"]
    } == {"P001": "A", "P002": "B", "P003": "C"}


def test_associations_count_each_pair_once_per_order() -> None:
    frame = pd.DataFrame(
        [
            _normalized_row(order_id="DH001", product_id="P001"),
            _normalized_row(order_id="DH001", product_id="P001"),
            _normalized_row(order_id="DH001", product_id="P002"),
            _normalized_row(order_id="DH002", product_id="P001"),
        ]
    )
    product_rows = [
        _product_metric("P001", revenue=300_000),
        _product_metric("P002", revenue=100_000),
    ]

    associations = calculate_product_intelligence(
        frame,
        product_rows,
    )["associations"]

    assert associations["observed_pair_count"] == 1
    assert associations["qualified_pair_count"] == 0
    assert associations["reason"] == "INSUFFICIENT_ASSOCIATION_SUPPORT"


def test_associations_skip_oversized_baskets() -> None:
    frame = pd.DataFrame(
        [
            _normalized_row(
                order_id="DH001",
                product_id=f"P{index:03}",
            )
            for index in range(1, 52)
        ]
    )
    product_rows = [
        _product_metric(f"P{index:03}", revenue=100_000)
        for index in range(1, 52)
    ]

    associations = calculate_product_intelligence(
        frame,
        product_rows,
    )["associations"]

    assert associations["available"] is False
    assert associations["skipped_oversized_order_count"] == 1
    assert associations["rules"] == []


def test_discount_analysis_explains_no_discount_data() -> None:
    result = calculate_discount_analysis(
        pd.DataFrame([_normalized_row()])
    )

    assert result["available"] is False
    assert result["reason"] == "NO_DISCOUNT_DATA"
    assert result["discount_amount"] == 0
    assert result["discounted_order_count"] == 0
    assert result["by_product"] == []


def test_demo_forecast_matches_oracle(demo_analytics: dict) -> None:
    forecast, warnings = calculate_forecast(
        demo_analytics["revenue_by_date"]
    )

    assert warnings == []
    assert forecast["method"] == "linear_trend_30_days"
    assert [
        point["predicted_revenue"] for point in forecast["points"]
    ] == [
        2_193_862,
        2_198_305,
        2_202_747,
        2_207_190,
        2_211_633,
        2_216_076,
        2_220_518,
    ]
    assert forecast["forecast_total"] == 15_450_331
    assert forecast["change_vs_last_7_days_percent"] == pytest.approx(
        -7.316548,
        abs=0.00001,
    )
    evaluation = forecast["evaluation"]
    assert evaluation["available"] is True
    assert evaluation["evaluated_method"] == "linear_trend_30_days"
    assert evaluation["baseline_method"] == "seasonal_naive_7_days"
    assert evaluation["fold_count"] == 4
    assert evaluation["evaluation_points"] == 28
    assert evaluation["model_metrics"] == {
        "mae": pytest.approx(856_855.5),
        "rmse": pytest.approx(1_034_308.06),
        "smape_percent": pytest.approx(42.263957),
    }
    assert evaluation["baseline_metrics"] == {
        "mae": pytest.approx(1_223_928.57),
        "rmse": pytest.approx(1_432_915.36),
        "smape_percent": pytest.approx(67.306507),
    }
    assert evaluation[
        "mae_improvement_vs_baseline_percent"
    ] == pytest.approx(29.99138)
    assert evaluation["reliability"] == "low"
    assert evaluation["folds"][0]["training_days"] == 32
    assert evaluation["folds"][-1]["validation_to"] == "2026-06-29"


def test_one_order_with_two_items_counts_as_one_order() -> None:
    frame = pd.DataFrame(
        [
            _normalized_row(product_id="P001", line_revenue=100_000),
            _normalized_row(product_id="P002", line_revenue=200_000),
        ]
    )

    result = calculate_analytics(frame)

    assert result["summary"]["total_orders"] == 1
    assert result["summary"]["total_revenue"] == 300_000
    assert result["summary"]["total_quantity_sold"] == 2


def test_cancelled_and_returned_rows_do_not_count() -> None:
    frame = pd.DataFrame(
        [
            _normalized_row(order_id="DH001", order_status="completed"),
            _normalized_row(order_id="DH002", order_status="cancelled"),
            _normalized_row(order_id="DH003", order_status="returned"),
        ]
    )

    result = calculate_analytics(frame)

    assert result["summary"]["total_orders"] == 1
    assert result["summary"]["total_revenue"] == 100_000
    assert result["orders"]["by_status"] == {
        "completed": 1,
        "cancelled": 1,
        "returned": 1,
    }
    assert result["orders"]["status_rates_percent"] == {
        "completed": pytest.approx(33.333333),
        "cancelled": pytest.approx(33.333333),
        "returned": pytest.approx(33.333333),
    }


def test_no_completed_orders_is_a_domain_error() -> None:
    frame = pd.DataFrame(
        [_normalized_row(order_status="cancelled")]
    )

    with pytest.raises(AppError) as error:
        calculate_analytics(frame)

    assert error.value.code == "NO_COMPLETED_ORDERS"


def test_customer_segments_are_disjoint(demo_analytics: dict) -> None:
    segments = demo_analytics["customers"]["segments"]
    assert sum(segments.values()) == demo_analytics["summary"]["total_customers"]

    vip_ids = {
        item["customer_id"]
        for item in demo_analytics["customers"]["top_customers"]
        if item["segment"] == "vip"
    }
    potential_ids = {
        item["customer_id"]
        for item in demo_analytics["customers"]["potential_customers"]
    }
    assert vip_ids.isdisjoint(potential_ids)


def test_short_history_forecast_is_unavailable() -> None:
    forecast, warnings = calculate_forecast(_daily_points(13, revenue=100))

    assert forecast["available"] is False
    assert forecast["points"] == []
    assert forecast["evaluation"]["available"] is False
    assert forecast["evaluation"]["reason"] == "FORECAST_UNAVAILABLE"
    assert warnings == ["INSUFFICIENT_HISTORY"]


def test_medium_history_uses_moving_average() -> None:
    forecast, warnings = calculate_forecast(_daily_points(20, revenue=100))

    assert warnings == []
    assert forecast["method"] == "moving_average_7_days"
    assert len(forecast["points"]) == 7
    assert all(
        point["predicted_revenue"] == 100 for point in forecast["points"]
    )
    assert forecast["evaluation"]["available"] is False
    assert (
        forecast["evaluation"]["reason"]
        == "INSUFFICIENT_SELECTION_HISTORY"
    )
    assert forecast["evaluation"]["minimum_history_days"] == 28


def test_moving_average_evaluation_uses_two_recent_seven_day_folds() -> None:
    forecast, warnings = calculate_forecast(_daily_points(28, revenue=100))

    assert warnings == []
    evaluation = forecast["evaluation"]
    assert evaluation["available"] is True
    assert evaluation["fold_count"] == 2
    assert evaluation["evaluation_points"] == 14
    assert evaluation["model_metrics"] == {
        "mae": 0.0,
        "rmse": 0.0,
        "smape_percent": 0.0,
    }
    assert evaluation["baseline_metrics"] == evaluation["model_metrics"]
    assert evaluation["mae_improvement_vs_baseline_percent"] == 0.0
    assert evaluation["reliability"] == "medium"
    assert [
        (fold["training_days"], fold["validation_from"])
        for fold in evaluation["folds"]
    ] == [(14, "2026-01-15"), (21, "2026-01-22")]


def test_model_candidates_enter_only_when_they_have_two_folds() -> None:
    before_weekday, _ = calculate_forecast(
        _daily_points(41, revenue=100)
    )
    with_weekday, _ = calculate_forecast(
        _daily_points(42, revenue=100)
    )
    with_linear, _ = calculate_forecast(
        _daily_points(44, revenue=100)
    )

    assert [
        candidate["method"]
        for candidate in before_weekday["selection"]["candidates"]
    ] == ["seasonal_naive_7_days", "moving_average_7_days"]
    assert "weekday_average_4_weeks" in {
        candidate["method"]
        for candidate in with_weekday["selection"]["candidates"]
    }
    assert "linear_trend_30_days" in {
        candidate["method"]
        for candidate in with_linear["selection"]["candidates"]
    }


def test_forecast_clips_negative_values_to_zero() -> None:
    points = _daily_points(30, revenue=0)
    for index, point in enumerate(points):
        point["revenue"] = 3_000 - index * 100

    forecast, warnings = calculate_forecast(points)

    assert warnings == []
    assert len(forecast["points"]) == 7
    assert all(
        point["predicted_revenue"] >= 0 for point in forecast["points"]
    )


def test_rule_based_report_has_grounded_recommendations(
    demo_analytics: dict,
) -> None:
    report = build_rule_based_report(demo_analytics)
    report_text = " ".join(
        [
            report["executive_summary"],
            *[
                section["narrative"]
                for section in report["sections"]
            ],
            *[
                recommendation["action"]
                for recommendation in report["recommendations"]
            ],
        ]
    ).casefold()

    assert report["report_version"] == "2.0"
    assert report["source"] == "rule_based"
    assert 1 <= len(report["recommendations"]) <= 5
    assert "Tai nghe Bluetooth" in report["sections"][1]["narrative"]
    assert "273" in report["executive_summary"]
    assert "113,010,000" in report["executive_summary"]
    assert all(
        recommendation["evidence"]
        and recommendation["success_metric"]
        for recommendation in report["recommendations"]
    )
    assert all(
        forbidden not in report_text
        for forbidden in (
            "facebook ads",
            "giá cao hơn đối thủ",
            "tồn kho sắp hết",
            "lợi nhuận giảm",
        )
    )
    assert report["disclaimer"]


def test_rule_based_report_supports_natural_vietnamese(
    demo_analytics: dict,
) -> None:
    report = build_rule_based_report(demo_analytics, "vi")

    assert report["title"] == "Báo cáo tình hình kinh doanh"
    assert report["language"] == "vi"
    assert "273 đơn hoàn tất" in report["executive_summary"]
    assert "113.010.000 VND" in report["executive_summary"]
    assert report["sections"][0]["title"] == "Hiệu quả doanh thu"
    assert report["disclaimer"].startswith("Báo cáo sử dụng")


def _normalized_row(
    *,
    order_id: str = "DH001",
    order_date: pd.Timestamp = pd.Timestamp("2026-07-01"),
    customer_id: str = "C001",
    product_id: str = "P001",
    order_status: str = "completed",
    line_revenue: int = 100_000,
) -> dict:
    return {
        "order_id": order_id,
        "order_date": order_date,
        "customer_id": customer_id,
        "customer_name": f"Customer {customer_id}",
        "product_id": product_id,
        "product_name": f"Product {product_id}",
        "category": "Category",
        "quantity": 1,
        "unit_price": line_revenue,
        "discount": 0,
        "order_status": order_status,
        "line_revenue": line_revenue,
    }


def _product_metric(product_id: str, *, revenue: int) -> dict:
    return {
        "product_id": product_id,
        "product_name": f"Product {product_id}",
        "category": "Category",
        "revenue": revenue,
        "quantity": 1,
        "order_count": 1,
    }


def _daily_points(days: int, *, revenue: int) -> list[dict]:
    start = date(2026, 1, 1)
    return [
        {
            "date": (start + timedelta(days=index)).isoformat(),
            "revenue": revenue,
        }
        for index in range(days)
    ]
