from collections import Counter
from pathlib import Path

import pandas as pd
import pytest

from backend.app.services.validator import validate_sales_data
from scripts.generate_ds_demo_data import (
    DEMO_CUSTOMERS,
    DEMO_DAYS,
    DEMO_START_DATE,
    ZERO_SALES_DAY_INDEXES,
    build_known_association_rows,
    build_known_cohort_rows,
    build_rich_demo_rows,
    build_weekly_forecast_rows,
    find_dataset_mismatches,
    render_csv,
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def test_rich_demo_is_deterministic_valid_and_within_upload_limits() -> None:
    first = build_rich_demo_rows()
    second = build_rich_demo_rows()

    assert first == second
    assert 10_000 <= len(first) <= 50_000
    assert len({row["customer_id"] for row in first}) == DEMO_CUSTOMERS
    assert len({row["product_id"] for row in first}) == 24
    assert all(
        str(row["customer_name"]).startswith("Khach hang synthetic ")
        for row in first
    )

    validated = validate_sales_data(
        pd.DataFrame(first),
        max_rows=50_000,
    )
    assert len(validated) == len(first)
    assert (
        validated["order_date"].max()
        - validated["order_date"].min()
    ).days == DEMO_DAYS - 1


def test_rich_demo_contains_known_operational_patterns() -> None:
    rows = build_rich_demo_rows()
    completed = [
        row for row in rows if row["order_status"] == "completed"
    ]
    order_products: dict[str, set[str]] = {}
    for row in completed:
        order_products.setdefault(str(row["order_id"]), set()).add(
            str(row["product_id"])
        )

    multi_product_orders = sum(
        len(products) >= 2 for products in order_products.values()
    )
    p001_orders = sum(
        "P001" in products for products in order_products.values()
    )
    p001_p002_orders = sum(
        {"P001", "P002"}.issubset(products)
        for products in order_products.values()
    )
    p002_orders = sum(
        "P002" in products for products in order_products.values()
    )
    p001_to_p002_confidence = p001_p002_orders / p001_orders
    p002_support = p002_orders / len(order_products)

    assert multi_product_orders / len(order_products) >= 0.45
    assert p001_to_p002_confidence / p002_support >= 2
    assert {
        row["order_status"] for row in rows
    } == {"completed", "cancelled", "returned"}
    assert any(int(row["discount"]) > 0 for row in rows)

    observed_dates = {
        str(row["order_date"]) for row in rows
    }
    expected_zero_dates = {
        (
            DEMO_START_DATE
            + pd.Timedelta(days=day_index)
        ).isoformat()
        for day_index in ZERO_SALES_DAY_INDEXES
    }
    assert expected_zero_dates.isdisjoint(observed_dates)


def test_weekly_scenario_repeats_the_same_weekday_pattern() -> None:
    rows = build_weekly_forecast_rows()
    revenue_by_weekday: dict[int, set[int]] = {}
    for row in rows:
        weekday = pd.Timestamp(row["order_date"]).weekday()
        revenue_by_weekday.setdefault(weekday, set()).add(
            int(row["unit_price"])
        )

    assert len(rows) == 84
    assert all(
        len(values) == 1 for values in revenue_by_weekday.values()
    )
    assert len(revenue_by_weekday) == 7


def test_association_scenario_has_an_exact_oracle() -> None:
    rows = build_known_association_rows()
    orders_by_product = Counter()
    pair_count = 0
    order_products: dict[str, set[str]] = {}
    for row in rows:
        order_products.setdefault(str(row["order_id"]), set()).add(
            str(row["product_id"])
        )
    for products in order_products.values():
        for product_id in products:
            orders_by_product[product_id] += 1
        pair_count += {"P001", "P002"}.issubset(products)

    assert len(order_products) == 100
    assert orders_by_product["P001"] == 50
    assert orders_by_product["P002"] == 40
    assert pair_count == 30
    assert pair_count / orders_by_product["P001"] == 0.6
    assert pair_count / orders_by_product["P002"] == 0.75
    assert (pair_count / 50) / (40 / 100) == pytest.approx(1.5)


def test_cohort_scenario_has_known_retention_counts() -> None:
    rows = build_known_cohort_rows()
    january_customers = {
        str(row["customer_id"])
        for row in rows
        if str(row["order_date"]).startswith("2026-01")
    }
    february_returning = {
        str(row["customer_id"])
        for row in rows
        if str(row["order_date"]).startswith("2026-02")
    } & january_customers
    march_returning = {
        str(row["customer_id"])
        for row in rows
        if str(row["order_date"]).startswith("2026-03")
    } & january_customers

    assert len(january_customers) == 10
    assert len(february_returning) == 6
    assert len(march_returning) == 4


def test_committed_scenario_files_match_the_generator() -> None:
    expected = {
        "forecast_weekly_84_days.csv": build_weekly_forecast_rows(),
        "association_known_lift.csv": build_known_association_rows(),
        "cohort_known_retention.csv": build_known_cohort_rows(),
    }
    for file_name, rows in expected.items():
        content = (
            PROJECT_ROOT
            / "sample_data"
            / "ds_scenarios"
            / file_name
        ).read_text(encoding="utf-8")
        assert content == render_csv(rows)

    rich_content = (
        PROJECT_ROOT
        / "sample_data"
        / "marketlens_ds_demo_365_days.csv"
    ).read_text(encoding="utf-8")
    assert rich_content == render_csv(build_rich_demo_rows())
    public_content = (
        PROJECT_ROOT
        / "frontend"
        / "public"
        / "marketlens_ds_demo_365_days.csv"
    ).read_text(encoding="utf-8")
    assert public_content == rich_content


def test_committed_datasets_pass_the_generator_check() -> None:
    assert find_dataset_mismatches(PROJECT_ROOT) == []
