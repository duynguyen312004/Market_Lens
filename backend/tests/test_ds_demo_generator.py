from collections import Counter
import json
from pathlib import Path

import pandas as pd
import pytest

from backend.app.core.errors import AppError
from backend.app.services.analytics import calculate_analytics
from backend.app.services.combined_analysis import (
    ValidatedSource,
    combine_validated_sales_data,
)
from backend.app.services.file_reader import read_sales_file
from backend.app.services.forecast import calculate_forecast
from backend.app.services.import_pipeline import (
    ImportOptions,
    normalize_sales_import,
)
from backend.app.services.validator import validate_sales_data
from scripts.generate_ds_demo_data import (
    DATASET_CUTOFF_DATE,
    DEMO_CUSTOMERS,
    DEMO_DAYS,
    DEMO_START_DATE,
    REGRESSION_CUSTOMERS,
    REGRESSION_DAYS,
    ZERO_SALES_DAY_INDEXES,
    build_known_association_rows,
    build_known_cohort_rows,
    build_regression_60_day_rows,
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
    assert (
        validated["order_date"].max().date()
        == DATASET_CUTOFF_DATE
    )


def test_regression_demo_is_deterministic_and_covers_sixty_days() -> None:
    first = build_regression_60_day_rows()
    second = build_regression_60_day_rows()

    assert first == second
    validated = validate_sales_data(
        pd.DataFrame(first),
        max_rows=50_000,
    )
    assert validated["customer_id"].nunique() == REGRESSION_CUSTOMERS
    assert (
        validated["order_date"].max()
        - validated["order_date"].min()
    ).days == REGRESSION_DAYS - 1
    assert set(validated["order_status"]) == {
        "completed",
        "cancelled",
        "returned",
    }


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
        pair_count += {"AS-P001", "AS-P002"}.issubset(products)

    assert len(order_products) == 100
    assert orders_by_product["AS-P001"] == 50
    assert orders_by_product["AS-P002"] == 40
    assert pair_count == 30
    assert pair_count / orders_by_product["AS-P001"] == 0.6
    assert pair_count / orders_by_product["AS-P002"] == 0.75
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


def test_manifest_files_have_expected_validation_outcomes() -> None:
    manifest = json.loads(
        (
            PROJECT_ROOT / "sample_data" / "DATASET_MANIFEST.json"
        ).read_text(encoding="utf-8")
    )
    assert manifest["cutoff_date"] == DATASET_CUTOFF_DATE.isoformat()
    for relative_path, metadata in manifest["files"].items():
        if metadata["date_to"] is not None:
            assert metadata["date_to"] <= manifest["cutoff_date"]
        path = PROJECT_ROOT / relative_path
        frame = read_sales_file(
            file_name=path.name,
            content=path.read_bytes(),
        )
        if metadata["expected_valid"]:
            if "platform_sample" in metadata["dataset_key"]:
                imported = normalize_sales_import(
                    frame,
                    options=ImportOptions(),
                )
                validated = validate_sales_data(
                    imported.frame,
                    max_rows=50_000,
                )
                assert imported.source_row_count == metadata["row_count"]
                assert len(validated) > 0
                continue
            validated = validate_sales_data(frame, max_rows=50_000)
            assert len(validated) == metadata["row_count"]
            continue

        with pytest.raises(AppError) as caught:
            validate_sales_data(frame, max_rows=50_000)
        assert caught.value.code == metadata["expected_error_code"]


@pytest.mark.parametrize(
    ("case_name", "expected_column"),
    [
        ("invalid_customer_conflict", "customer_name"),
        ("invalid_product_conflict", "product_name"),
        ("invalid_order_conflict", "order_id"),
    ],
)
def test_committed_combined_conflict_cases(
    case_name: str,
    expected_column: str,
) -> None:
    manifest = json.loads(
        (
            PROJECT_ROOT / "sample_data" / "DATASET_MANIFEST.json"
        ).read_text(encoding="utf-8")
    )
    sources = [
        _validated_source(relative_path)
        for relative_path in manifest["combined_cases"][case_name]
    ]

    with pytest.raises(AppError) as caught:
        combine_validated_sales_data(sources, max_rows=50_000)

    assert caught.value.code == "CONFLICTING_DATA_ACROSS_FILES"
    assert caught.value.details["errors"][0]["column"] == expected_column


def test_committed_combined_demo_removes_one_exact_duplicate() -> None:
    manifest = json.loads(
        (
            PROJECT_ROOT / "sample_data" / "DATASET_MANIFEST.json"
        ).read_text(encoding="utf-8")
    )
    sources = [
        _validated_source(relative_path)
        for relative_path in manifest["combined_cases"][
            "valid_with_exact_duplicate"
        ]
    ]

    combined = combine_validated_sales_data(
        sources,
        max_rows=50_000,
    )

    assert combined.source_row_count == 21
    assert len(combined.frame) == 20
    assert combined.duplicate_order_count == 1
    assert combined.duplicate_row_count == 1
    assert combined.warnings == ["DUPLICATE_ORDERS_REMOVED"]


def test_template_and_regression_demo_have_disjoint_namespaces() -> None:
    sources = [
        _validated_source("sample_data/sample_sales_template.csv"),
        _validated_source(
            "sample_data/sample_sales_demo_60_days.csv"
        ),
    ]

    combined = combine_validated_sales_data(
        sources,
        max_rows=50_000,
    )

    assert combined.source_row_count == 615
    assert len(combined.frame) == 615
    assert combined.duplicate_order_count == 0
    assert combined.warnings == []


def test_boundary_datasets_trigger_the_documented_empty_states() -> None:
    short = _validated_path(
        "sample_data/test_cases/insufficient_history_13_days.csv"
    )
    short_analytics = calculate_analytics(short)
    short_forecast, short_warnings = calculate_forecast(
        short_analytics["revenue_by_date"]
    )
    assert short_warnings == ["INSUFFICIENT_HISTORY"]
    assert all(
        horizon["available"] is False
        for horizon in short_forecast["horizons"]
    )

    seven_only = _validated_path(
        "sample_data/test_cases/forecast_7_only_30_days.csv"
    )
    seven_analytics = calculate_analytics(seven_only)
    seven_forecast, warnings = calculate_forecast(
        seven_analytics["revenue_by_date"]
    )
    assert warnings == []
    assert [
        (horizon["horizon_days"], horizon["available"])
        for horizon in seven_forecast["horizons"]
    ] == [(7, True), (30, False)]

    no_issues = calculate_analytics(
        _validated_path(
            "sample_data/test_cases/no_cancelled_or_returned.csv"
        )
    )
    assert no_issues["sales"]["product_order_issues"]["reason"] == (
        "NO_CANCELLED_OR_RETURNED_ORDERS"
    )

    single_product = calculate_analytics(
        _validated_path(
            "sample_data/test_cases/single_product_orders.csv"
        )
    )
    associations = single_product["sales"]["product_intelligence"][
        "associations"
    ]
    assert associations["available"] is False
    assert associations["reason"] == "NO_MULTI_PRODUCT_ORDERS"


def _validated_source(relative_path: str) -> ValidatedSource:
    path = PROJECT_ROOT / relative_path
    frame = read_sales_file(
        file_name=path.name,
        content=path.read_bytes(),
    )
    return ValidatedSource(
        file_name=path.name,
        frame=validate_sales_data(frame, max_rows=50_000),
    )


def _validated_path(relative_path: str) -> pd.DataFrame:
    path = PROJECT_ROOT / relative_path
    return validate_sales_data(
        read_sales_file(
            file_name=path.name,
            content=path.read_bytes(),
        ),
        max_rows=50_000,
    )
