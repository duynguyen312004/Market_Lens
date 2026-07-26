from pathlib import Path

import pandas as pd
import pytest

from backend.app.core.errors import AppError
from backend.app.services.file_reader import read_sales_file
from backend.app.services.import_pipeline import (
    ImportOptions,
    _normalize_status_value,
    normalize_sales_import,
    preview_sales_import,
)
from backend.app.services.validator import REQUIRED_COLUMNS, validate_sales_data


SAMPLE_DIR = Path("sample_data/platform_samples")


def _read(name: str) -> pd.DataFrame:
    path = SAMPLE_DIR / name
    return read_sales_file(file_name=path.name, content=path.read_bytes())


def test_tiktok_export_is_detected_and_uses_item_subtotal() -> None:
    raw = _read("tiktok_shop_orders_sample.csv")

    preview = preview_sales_import(raw, options=ImportOptions())
    imported = normalize_sales_import(raw, options=ImportOptions())
    validated = validate_sales_data(imported.frame, max_rows=50_000)

    assert preview.detected_source_type == "tiktok"
    assert preview.detection_confidence == "exact"
    assert preview.ready_for_analysis is True
    assert imported.source_row_count == 5
    assert imported.skipped_row_count == 1
    assert "NON_FINAL_ORDERS_SKIPPED" in imported.warnings
    first = validated.loc[
        validated["order_id"].eq("tiktok:TT-DEMO-001")
    ].iloc[0]
    assert first["line_revenue"] == 270_000
    assert first["discount"] == 30_000
    assert set(validated["order_status"]) == {
        "completed",
        "cancelled",
        "returned",
    }


def test_shopee_export_ignores_order_total_and_defaults_category() -> None:
    raw = _read("shopee_orders_sample.csv")

    preview = preview_sales_import(raw, options=ImportOptions())
    imported = normalize_sales_import(raw, options=ImportOptions())
    validated = validate_sales_data(imported.frame, max_rows=50_000)

    assert preview.detected_source_type == "shopee"
    assert "CATEGORY_DEFAULTED" in preview.warnings
    assert imported.skipped_row_count == 1
    first = validated.loc[
        validated["order_id"].eq("shopee:SP-DEMO-001")
    ].iloc[0]
    assert first["line_revenue"] == 450_000
    assert first["line_revenue"] != 465_000
    assert first["category"] == "Chưa phân loại"


def test_custom_mapping_without_customer_identifier_disables_customer_analytics() -> None:
    raw = pd.DataFrame(
        {
            "Mã đơn": ["A-1"],
            "Ngày": ["2026-07-01"],
            "Sản phẩm": ["Sổ tay"],
            "SL": [2],
            "Thành tiền": [180_000],
            "Tình trạng": ["Đã giao"],
        }
    )
    mapping = {
        "order_id": "Mã đơn",
        "order_date": "Ngày",
        "product_name": "Sản phẩm",
        "quantity": "SL",
        "line_revenue": "Thành tiền",
        "order_status": "Tình trạng",
    }

    imported = normalize_sales_import(
        raw,
        options=ImportOptions(
            source_type="custom",
            column_mapping=mapping,
        ),
    )

    assert imported.capabilities.customer_analytics is False
    assert imported.frame.loc[0, "customer_id"].startswith(
        "custom:anonymous-order:"
    )
    assert "CUSTOMER_ANALYTICS_UNAVAILABLE" in imported.warnings


def test_profile_header_change_is_reported() -> None:
    raw = _read("tiktok_shop_orders_sample.csv")
    options = ImportOptions(
        source_type="tiktok",
        expected_header_fingerprint="0" * 64,
    )
    preview = preview_sales_import(raw, options=options)

    assert "PROFILE_HEADERS_CHANGED" in preview.warnings
    assert preview.ready_for_analysis is False

    with pytest.raises(AppError) as error:
        normalize_sales_import(raw, options=options)

    assert error.value.code == "IMPORT_PROFILE_HEADERS_CHANGED"


def test_negative_return_detail_does_not_turn_completed_order_into_return() -> None:
    assert (
        _normalize_status_value(
            "Completed",
            source_type="tiktok",
            provided_mapping=None,
            return_type="No Return/Refund",
            returned_quantity=0,
        )
        == "completed"
    )


def test_pending_return_detail_skips_completed_order_until_final() -> None:
    assert (
        _normalize_status_value(
            "Completed",
            source_type="tiktok",
            provided_mapping=None,
            return_type="Return/Refund Requested",
            returned_quantity=0,
        )
        == "skip"
    )


@pytest.mark.parametrize(
    ("raw_status", "expected"),
    [
        ("Not completed", "unknown"),
        ("Uncompleted", "unknown"),
        ("Return requested", "skip"),
        ("Refund pending", "skip"),
        ("Pending cancellation", "skip"),
        ("Ready to ship", "skip"),
        ("Completed", "completed"),
        ("Đã giao", "completed"),
    ],
)
def test_status_normalization_does_not_promote_pending_or_negative_phrases(
    raw_status: str,
    expected: str,
) -> None:
    assert (
        _normalize_status_value(
            raw_status,
            source_type="tiktok",
            provided_mapping=None,
        )
        == expected
    )


def test_preview_checks_unknown_statuses_beyond_display_limit() -> None:
    statuses = [f"Status {index:03d}" for index in range(51)]
    raw = pd.DataFrame(
        {
            "Order ID": [f"A-{index}" for index in range(51)],
            "Created Time": ["2026-07-01"] * 51,
            "Product Name": ["Sổ tay"] * 51,
            "Quantity": [1] * 51,
            "SKU Subtotal After Discount": [100_000] * 51,
            "Order Status": statuses,
        }
    )
    provided_mapping = {
        status: "skip" for status in statuses[:50]
    }

    preview = preview_sales_import(
        raw,
        options=ImportOptions(status_mapping=provided_mapping),
    )

    assert len(preview.status_values) == 50
    assert preview.unknown_status_values == ["Status 050"]
    assert preview.ready_for_analysis is False
    assert "STATUS_VALUES_TRUNCATED" in preview.warnings


def test_empty_marketlens_template_is_not_ready() -> None:
    raw = pd.DataFrame(columns=REQUIRED_COLUMNS)

    preview = preview_sales_import(raw, options=ImportOptions())

    assert preview.detected_source_type == "marketlens"
    assert preview.row_count == 0
    assert preview.ready_for_analysis is False
    with pytest.raises(AppError) as error:
        normalize_sales_import(raw, options=ImportOptions())
    assert error.value.code == "EMPTY_FILE"


def test_forced_marketlens_source_requires_exact_template_columns() -> None:
    raw = pd.DataFrame(
        {
            "order_id": ["A-1"],
            "order_date": ["2026-07-01"],
            "product_name": ["Sổ tay"],
            "quantity": [1],
            "unit_price": [100_000],
            "order_status": ["completed"],
        }
    )
    options = ImportOptions(source_type="marketlens")

    preview = preview_sales_import(raw, options=options)

    assert preview.ready_for_analysis is False
    assert "MARKETLENS_COLUMNS_MISMATCH" in preview.warnings
    with pytest.raises(AppError) as error:
        normalize_sales_import(raw, options=options)
    assert error.value.code == "INVALID_FILE_COLUMNS"
