from copy import deepcopy
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
from backend.app.services.analytics.product_order_issues import (
    calculate_product_order_issues,
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
    assert demo_analytics["contract_version"] == "5.0"
    summary = demo_analytics["summary"]
    assert summary == {
        "total_revenue": 185_263_000,
        "total_orders": 362,
        "total_customers": 30,
        "total_quantity_sold": 719,
        "growth_rate_percent": pytest.approx(17.321519),
        "average_order_value": 511_776.24,
        "average_revenue_per_customer": 6_175_433.33,
    }
    assert demo_analytics["customers"]["segments"] == {
        "new": 0,
        "returning": 27,
        "vip": 3,
    }
    assert [
        customer["customer_id"]
        for customer in demo_analytics["customers"]["potential_customers"]
    ] == [
        "R60C003",
        "R60C004",
        "R60C015",
        "R60C005",
        "R60C007",
        "R60C008",
    ]

    top_product = demo_analytics["sales"]["top_products_by_revenue"][0]
    assert top_product == {
        "product_id": "R60P002",
        "product_name": "Quan jean",
        "category": "Thoi trang",
        "revenue": 49_095_000,
        "quantity": 130,
        "order_count": 100,
    }


def test_demo_advanced_metrics_match_oracle(
    demo_analytics: dict,
) -> None:
    assert demo_analytics["orders"] == {
        "total_orders_all_statuses": 404,
        "by_status": {
            "completed": 362,
            "cancelled": 25,
            "returned": 17,
        },
        "status_rates_percent": {
            "completed": pytest.approx(89.60396),
            "cancelled": pytest.approx(6.188119),
            "returned": pytest.approx(4.207921),
        },
        "average_items_per_completed_order": pytest.approx(1.986188),
    }

    sales = demo_analytics["sales"]
    assert sales["gross_revenue"] == 190_921_000
    assert sales["total_discount"] == 5_658_000
    assert sales["discount_rate_percent"] == pytest.approx(2.963529)
    assert sales["peak_revenue_day"] == {
        "date": "2026-06-14",
        "revenue": 5_819_000,
    }
    assert sales["lowest_nonzero_revenue_day"] == {
        "date": "2026-06-03",
        "revenue": 1_140_000,
    }
    assert sales["concentration"] == {
        "top_product_revenue_share_percent": pytest.approx(26.500165),
        "top_category_revenue_share_percent": pytest.approx(38.14847),
        "top_20_percent_product_count": 2,
        "top_20_percent_products_revenue_share_percent": pytest.approx(
            48.937996
        ),
    }
    assert len(sales["revenue_by_weekday"]) == 7
    friday = sales["revenue_by_weekday"][4]
    assert friday == {
        "weekday": "friday",
        "weekday_index": 4,
        "revenue": 30_983_000,
        "order_count": 66,
        "revenue_share_percent": pytest.approx(16.723793),
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
            "revenue": 139_511_000,
            "revenue_share_percent": pytest.approx(75.304297),
        },
        {
            "segment": "vip",
            "customer_count": 3,
            "revenue": 45_752_000,
            "revenue_share_percent": pytest.approx(24.695703),
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
        "champion": 6,
        "loyal": 6,
        "at_risk": 5,
        "regular": 13,
    }
    assert [
        customer["customer_id"]
        for customer in rfm["at_risk_customers"]
    ] == [
        "R60C005",
        "R60C009",
        "R60C013",
        "R60C011",
        "R60C022",
    ]

    intelligence = demo_analytics["sales"]["product_intelligence"]
    assert intelligence["abc"]["classified_product_count"] == 8
    assert intelligence["abc"]["classes"] == {
        "A": {
            "product_count": 5,
            "revenue": 156_674_000,
            "revenue_share_percent": pytest.approx(84.568424),
        },
        "B": {
            "product_count": 2,
            "revenue": 23_004_000,
            "revenue_share_percent": pytest.approx(12.416942),
        },
        "C": {
            "product_count": 1,
            "revenue": 5_585_000,
            "revenue_share_percent": pytest.approx(3.014633),
        },
    }
    associations = intelligence["associations"]
    assert associations["basket_order_count"] == 151
    assert associations["skipped_oversized_order_count"] == 0
    assert associations["rules"][0] == {
        "source_product_id": "R60P002",
        "source_product_name": "Quan jean",
        "target_product_id": "R60P001",
        "target_product_name": "Ao thun co ban",
        "pair_order_count": 38,
        "source_order_count": 100,
        "target_order_count": 103,
        "support_percent": pytest.approx(10.497238),
        "confidence_percent": pytest.approx(38.0),
        "lift": pytest.approx(1.335534),
    }
    assert demo_analytics["customers"]["cohort_analysis"]["available"] is False
    assert demo_analytics["customers"]["cohort_analysis"]["reason"] == (
        "INSUFFICIENT_COHORT_HISTORY"
    )

    discount = demo_analytics["sales"]["discount_analysis"]
    assert discount["discounted_order_count"] == 138
    assert discount["discounted_order_rate_percent"] == pytest.approx(
        38.121547
    )
    assert discount["by_product"][0]["product_id"] == "R60P002"
    assert discount["by_product"][0]["discount_amount"] == 1_475_000

    order_issues = demo_analytics["sales"]["product_order_issues"]
    assert order_issues["available"] is True
    assert order_issues["affected_order_count"] == 42
    assert order_issues["affected_product_value"] == 22_870_000
    assert order_issues["products"][0] == {
        "product_id": "R60P008",
        "product_name": "So tay planner",
        "category": "Van phong",
        "total_order_count": 54,
        "completed_order_count": 43,
        "cancelled_order_count": 6,
        "returned_order_count": 5,
        "issue_order_count": 11,
        "cancellation_rate_percent": pytest.approx(11.111111),
        "return_rate_percent": pytest.approx(9.259259),
        "issue_rate_percent": pytest.approx(20.37037),
        "ranking_score_percent": pytest.approx(11.773934),
        "affected_product_value": 1_817_000,
    }


def test_product_order_issue_ranking_reduces_small_sample_bias() -> None:
    rows = [
        _normalized_row(
            order_id=f"A{index:03}",
            product_id="P-A",
            order_status="cancelled" if index <= 5 else "completed",
        )
        for index in range(1, 101)
    ]
    rows.extend(
        _normalized_row(
            order_id=f"B{index:03}",
            product_id="P-B",
            order_status="returned" if index == 1 else "completed",
        )
        for index in range(1, 11)
    )
    rows.extend(
        _normalized_row(
            order_id=f"C{index:03}",
            product_id="P-C",
            order_status="returned",
        )
        for index in range(1, 3)
    )

    result = calculate_product_order_issues(pd.DataFrame(rows))

    assert result["available"] is True
    assert result["evaluated_product_count"] == 3
    assert result["qualified_product_count"] == 2
    assert [
        product["product_id"] for product in result["products"]
    ] == ["P-A", "P-B"]
    assert result["products"][0]["issue_rate_percent"] == 5.0
    assert result["products"][1]["issue_rate_percent"] == 10.0
    assert (
        result["products"][0]["ranking_score_percent"]
        > result["products"][1]["ranking_score_percent"]
    )


def test_product_order_issue_counts_distinct_orders_per_product() -> None:
    rows = [
        _normalized_row(
            order_id="RETURNED-1",
            product_id="P-A",
            order_status="returned",
        ),
        _normalized_row(
            order_id="RETURNED-1",
            product_id="P-A",
            order_status="returned",
        ),
    ]
    rows.extend(
        _normalized_row(
            order_id=f"COMPLETED-{index}",
            product_id="P-A",
        )
        for index in range(1, 10)
    )

    result = calculate_product_order_issues(pd.DataFrame(rows))
    product = result["products"][0]

    assert product["total_order_count"] == 10
    assert product["returned_order_count"] == 1
    assert product["issue_rate_percent"] == 10.0
    assert product["affected_product_value"] == 200_000


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
    forecast_7 = _forecast_horizon(forecast, 7)
    assert forecast_7["method"] == "weekday_average_4_weeks"
    assert [
        point["predicted_revenue"] for point in forecast_7["points"]
    ] == [
        3_175_250,
        2_247_750,
        3_014_750,
        3_679_000,
        4_411_000,
        3_670_250,
        2_508_500,
    ]
    assert forecast_7["forecast_total"] == 22_706_500
    assert forecast_7[
        "change_vs_previous_period_percent"
    ] == pytest.approx(
        -2.004661,
        abs=0.00001,
    )
    evaluation = forecast_7["evaluation"]
    assert evaluation["available"] is True
    assert evaluation["evaluated_method"] == "weekday_average_4_weeks"
    assert evaluation["baseline_method"] == "seasonal_naive_7_days"
    assert evaluation["fold_count"] == 4
    assert evaluation["evaluation_points"] == 28
    assert evaluation["model_daily_metrics"] == {
        "mae": pytest.approx(1_083_410.71),
        "rmse": pytest.approx(1_254_129.63),
        "smape_percent": pytest.approx(35.526306),
    }
    assert evaluation["baseline_daily_metrics"] == {
        "mae": pytest.approx(1_417_214.29),
        "rmse": pytest.approx(1_665_305.16),
        "smape_percent": pytest.approx(46.734697),
    }
    assert evaluation[
        "primary_mae_improvement_vs_baseline_percent"
    ] == pytest.approx(23.553501)
    assert evaluation["reliability"] == "medium"
    assert evaluation["folds"][0]["training_days"] == 32
    assert evaluation["folds"][-1]["validation_to"] == "2026-06-29"
    forecast_30 = _forecast_horizon(forecast, 30)
    assert forecast_30["available"] is True
    assert forecast_30["forecast_total"] == 99_304_290
    assert len(forecast_30["points"]) == 30


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

    forecast_7 = _forecast_horizon(forecast, 7)
    assert forecast_7["available"] is False
    assert forecast_7["points"] == []
    assert forecast_7["evaluation"]["available"] is False
    assert forecast_7["evaluation"]["reason"] == "FORECAST_UNAVAILABLE"
    assert warnings == ["INSUFFICIENT_HISTORY"]


def test_medium_history_uses_moving_average() -> None:
    forecast, warnings = calculate_forecast(_daily_points(20, revenue=100))

    assert warnings == []
    forecast_7 = _forecast_horizon(forecast, 7)
    assert forecast_7["method"] == "moving_average_7_days"
    assert len(forecast_7["points"]) == 7
    assert all(
        point["predicted_revenue"] == 100
        for point in forecast_7["points"]
    )
    assert forecast_7["evaluation"]["available"] is False
    assert (
        forecast_7["evaluation"]["reason"]
        == "INSUFFICIENT_SELECTION_HISTORY"
    )
    assert forecast_7["evaluation"]["minimum_history_days"] == 28


def test_moving_average_evaluation_uses_two_recent_seven_day_folds() -> None:
    forecast, warnings = calculate_forecast(_daily_points(28, revenue=100))

    assert warnings == []
    evaluation = _forecast_horizon(forecast, 7)["evaluation"]
    assert evaluation["available"] is True
    assert evaluation["fold_count"] == 2
    assert evaluation["evaluation_points"] == 14
    assert evaluation["model_daily_metrics"] == {
        "mae": 0.0,
        "rmse": 0.0,
        "smape_percent": 0.0,
    }
    assert (
        evaluation["baseline_daily_metrics"]
        == evaluation["model_daily_metrics"]
    )
    assert evaluation[
        "primary_mae_improvement_vs_baseline_percent"
    ] == 0.0
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
        for candidate in _forecast_horizon(
            before_weekday,
            7,
        )["selection"]["candidates"]
    ] == ["seasonal_naive_7_days", "moving_average_7_days"]
    assert "weekday_average_4_weeks" in {
        candidate["method"]
        for candidate in _forecast_horizon(
            with_weekday,
            7,
        )["selection"]["candidates"]
    }
    assert "linear_trend_30_days" in {
        candidate["method"]
        for candidate in _forecast_horizon(
            with_linear,
            7,
        )["selection"]["candidates"]
    }


def test_forecast_clips_negative_values_to_zero() -> None:
    points = _daily_points(30, revenue=0)
    for index, point in enumerate(points):
        point["revenue"] = 3_000 - index * 100

    forecast, warnings = calculate_forecast(points)

    assert warnings == []
    forecast_7 = _forecast_horizon(forecast, 7)
    assert len(forecast_7["points"]) == 7
    assert all(
        point["predicted_revenue"] >= 0
        for point in forecast_7["points"]
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
    assert "Quan jean" in report["sections"][1]["narrative"]
    assert "362" in report["executive_summary"]
    assert "185,263,000" in report["executive_summary"]
    assert "Test a product bundle" in {
        recommendation["title"]
        for recommendation in report["recommendations"]
    }
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


def test_rule_based_report_only_suggests_bundle_for_positive_relationship(
    demo_analytics: dict,
) -> None:
    stronger_pair_analysis = deepcopy(demo_analytics)
    stronger_pair_analysis["sales"]["product_intelligence"][
        "associations"
    ]["rules"][0]["lift"] = 1.5

    report = build_rule_based_report(stronger_pair_analysis)

    assert "Test a product bundle" in {
        recommendation["title"]
        for recommendation in report["recommendations"]
    }
    assert report["disclaimer"]


def test_rule_based_report_supports_natural_vietnamese(
    demo_analytics: dict,
) -> None:
    report = build_rule_based_report(demo_analytics, "vi")

    assert report["title"] == "Báo cáo tình hình kinh doanh"
    assert report["language"] == "vi"
    assert "362 đơn hoàn tất" in report["executive_summary"]
    assert "185.263.000 VND" in report["executive_summary"]
    assert report["sections"][0]["title"] == "Hiệu quả doanh thu"
    assert report["disclaimer"].startswith("Báo cáo sử dụng")


def test_rule_based_report_safely_truncates_long_product_names(
    demo_analytics: dict,
) -> None:
    analysis = deepcopy(demo_analytics)
    analysis["sales"]["top_products_by_revenue"][0]["product_name"] = (
        "Sản phẩm " + "A" * 250
    )

    report = build_rule_based_report(analysis, "vi")

    top_product_evidence = next(
        item
        for item in report["sections"][1]["evidence"]
        if item["metric_key"] == "sales.top_product.revenue"
    )
    assert len(top_product_evidence["context"]) <= 200
    assert all(
        len(recommendation["title"]) <= 160
        for recommendation in report["recommendations"]
    )


def test_rule_based_report_uses_growth_and_both_forecast_horizons(
    demo_analytics: dict,
) -> None:
    analysis = deepcopy(demo_analytics)
    analysis["forecast"], forecast_warnings = calculate_forecast(
        analysis["revenue_by_date"]
    )
    analysis["warnings"] = [
        *analysis["warnings"],
        *forecast_warnings,
    ]

    report = build_rule_based_report(analysis, "vi")
    product_evidence = {
        item["metric_key"] for item in report["sections"][1]["evidence"]
    }
    forecast_evidence = {
        item["metric_key"] for item in report["sections"][3]["evidence"]
    }

    assert any(
        key.startswith("sales.growth.month.product_increase")
        for key in product_evidence
    )
    assert "forecast.h7.forecast_total" in forecast_evidence
    assert "forecast.h30.forecast_total" in forecast_evidence
    assert "Doanh thu dự báo 7 ngày tới" in report["sections"][3][
        "narrative"
    ]
    assert "Doanh thu dự báo 30 ngày tới" in report["sections"][3][
        "narrative"
    ]


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


def _forecast_horizon(
    forecast: dict,
    horizon_days: int,
) -> dict:
    return next(
        item
        for item in forecast["horizons"]
        if item["horizon_days"] == horizon_days
    )
