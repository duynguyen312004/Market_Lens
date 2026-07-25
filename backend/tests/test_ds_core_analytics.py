from pathlib import Path

import pandas as pd
import pytest

from backend.app.services.analytics.associations import (
    calculate_product_associations,
)
from backend.app.services.analytics.cohorts import (
    calculate_customer_cohorts,
)
from backend.app.services.file_reader import read_sales_file
from backend.app.services.validator import validate_sales_data


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def test_known_association_metrics_match_oracle() -> None:
    completed = _validated_scenario("association_known_lift.csv")

    result = calculate_product_associations(completed)

    assert result["available"] is True
    assert result["eligible_completed_order_count"] == 100
    assert result["observed_pair_count"] == 1
    assert result["qualified_pair_count"] == 1
    assert len(result["rules"]) == 2
    p001_to_p002 = next(
        rule
        for rule in result["rules"]
        if rule["source_product_id"] == "P001"
    )
    assert p001_to_p002 == {
        "source_product_id": "P001",
        "source_product_name": "San pham P001",
        "target_product_id": "P002",
        "target_product_name": "San pham P002",
        "pair_order_count": 30,
        "source_order_count": 50,
        "target_order_count": 40,
        "support_percent": 30.0,
        "confidence_percent": 60.0,
        "lift": 1.5,
    }
    assert result["rules"][0]["confidence_percent"] == 75.0
    assert result["rules"][0]["source_product_id"] == "P002"


def test_association_explains_insufficient_support() -> None:
    completed = pd.DataFrame(
        [
            _normalized_row(
                order_id=f"DH{index:03d}",
                product_id=product_id,
            )
            for index, product_id in (
                (1, "P001"),
                (1, "P002"),
                (2, "P001"),
                (2, "P002"),
                (3, "P003"),
            )
        ]
    )

    result = calculate_product_associations(completed)

    assert result["available"] is False
    assert result["reason"] == "INSUFFICIENT_ASSOCIATION_SUPPORT"
    assert result["observed_pair_count"] == 1
    assert result["qualified_pair_count"] == 0
    assert result["rules"] == []


def test_association_excludes_oversized_orders_from_denominators() -> None:
    rows = [
        _normalized_row(
            order_id="OVERSIZED",
            product_id=f"P{index:03d}",
        )
        for index in range(1, 52)
    ]
    rows.append(
        _normalized_row(
            order_id="ELIGIBLE",
            product_id="P001",
        )
    )

    result = calculate_product_associations(pd.DataFrame(rows))

    assert result["total_completed_orders"] == 2
    assert result["eligible_completed_order_count"] == 1
    assert result["skipped_oversized_order_count"] == 1
    assert result["observed_pair_count"] == 0


def test_known_cohort_retention_matches_oracle() -> None:
    completed = _validated_scenario("cohort_known_retention.csv")

    result = calculate_customer_cohorts(completed)

    assert result["available"] is True
    assert result["period_from"] == "2026-01"
    assert result["period_to"] == "2026-06"
    assert result["observed_month_count"] == 6
    january = result["cohorts"][0]
    assert january["cohort_month"] == "2026-01"
    assert january["cohort_size"] == 10
    assert [
        period["active_customers"] for period in january["periods"]
    ] == [10, 6, 4, 2, 1, 0]
    assert [
        period["retention_percent"] for period in january["periods"]
    ] == [100.0, 60.0, 40.0, 20.0, 10.0, 0.0]


def test_cohort_counts_each_customer_once_per_month() -> None:
    completed = pd.DataFrame(
        [
            _normalized_row(
                order_id="DH001",
                order_date="2026-01-02",
            ),
            _normalized_row(
                order_id="DH002",
                order_date="2026-01-20",
            ),
            _normalized_row(
                order_id="DH003",
                order_date="2026-02-10",
            ),
            _normalized_row(
                order_id="DH004",
                order_date="2026-03-10",
            ),
        ]
    )

    result = calculate_customer_cohorts(completed)

    periods = result["cohorts"][0]["periods"]
    assert [period["active_customers"] for period in periods] == [1, 1, 1]
    assert periods[0]["order_count"] == 2
    assert periods[0]["revenue"] == 200_000


def test_cohort_handles_year_boundary_and_unobserved_future_cells() -> None:
    completed = pd.DataFrame(
        [
            _normalized_row(
                order_id="DH001",
                order_date="2025-12-10",
            ),
            _normalized_row(
                order_id="DH002",
                order_date="2026-01-10",
            ),
            _normalized_row(
                order_id="DH003",
                order_date="2026-02-10",
                customer_id="C002",
            ),
        ]
    )

    result = calculate_customer_cohorts(completed)

    december = result["cohorts"][0]
    february = result["cohorts"][1]
    assert [
        period["activity_month"] for period in december["periods"]
    ] == ["2025-12", "2026-01", "2026-02"]
    assert len(february["periods"]) == 1
    assert february["periods"][0]["retention_percent"] == 100.0


def test_cohort_is_unavailable_below_three_calendar_months() -> None:
    completed = pd.DataFrame(
        [
            _normalized_row(
                order_id="DH001",
                order_date="2026-01-01",
            ),
            _normalized_row(
                order_id="DH002",
                order_date="2026-02-28",
            ),
        ]
    )

    result = calculate_customer_cohorts(completed)

    assert result["available"] is False
    assert result["reason"] == "INSUFFICIENT_COHORT_HISTORY"
    assert result["observed_month_count"] == 2
    assert result["cohorts"] == []


def _validated_scenario(file_name: str) -> pd.DataFrame:
    path = PROJECT_ROOT / "sample_data" / "ds_scenarios" / file_name
    return validate_sales_data(
        read_sales_file(
            file_name=path.name,
            content=path.read_bytes(),
        ),
        max_rows=50_000,
    )


def _normalized_row(
    *,
    order_id: str,
    product_id: str = "P001",
    order_date: str = "2026-01-01",
    customer_id: str = "C001",
) -> dict[str, object]:
    return {
        "order_id": order_id,
        "order_date": pd.Timestamp(order_date),
        "customer_id": customer_id,
        "customer_name": f"Customer {customer_id}",
        "product_id": product_id,
        "product_name": f"Product {product_id}",
        "category": "Category",
        "quantity": 1,
        "unit_price": 100_000,
        "discount": 0,
        "order_status": "completed",
        "line_revenue": 100_000,
    }
