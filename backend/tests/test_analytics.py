from datetime import date, timedelta
from pathlib import Path

import pandas as pd
import pytest

from backend.app.core.errors import AppError
from backend.app.services.analytics import calculate_analytics
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
    summary = demo_analytics["summary"]
    assert summary == {
        "total_revenue": 113_010_000,
        "total_orders": 273,
        "total_customers": 30,
        "total_quantity_sold": 503,
        "growth_rate_percent": pytest.approx(37.201646),
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
    assert warnings == ["INSUFFICIENT_HISTORY"]


def test_medium_history_uses_moving_average() -> None:
    forecast, warnings = calculate_forecast(_daily_points(20, revenue=100))

    assert warnings == []
    assert forecast["method"] == "moving_average_7_days"
    assert len(forecast["points"]) == 7
    assert all(
        point["predicted_revenue"] == 100 for point in forecast["points"]
    )


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
            report["summary"],
            *report["highlights"],
            report["trend_analysis"],
            *[
                recommendation["description"]
                for recommendation in report["recommendations"]
            ],
        ]
    ).casefold()

    assert report["source"] == "rule_based"
    assert 1 <= len(report["recommendations"]) <= 3
    assert "Tai nghe Bluetooth" in " ".join(report["highlights"])
    assert "273" in report["summary"]
    assert "113,010,000" in report["summary"]
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


def _normalized_row(
    *,
    order_id: str = "DH001",
    product_id: str = "P001",
    order_status: str = "completed",
    line_revenue: int = 100_000,
) -> dict:
    return {
        "order_id": order_id,
        "order_date": pd.Timestamp("2026-07-01"),
        "customer_id": "C001",
        "customer_name": "Nguyen Van A",
        "product_id": product_id,
        "product_name": f"Product {product_id}",
        "category": "Category",
        "quantity": 1,
        "unit_price": line_revenue,
        "discount": 0,
        "order_status": order_status,
        "line_revenue": line_revenue,
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
