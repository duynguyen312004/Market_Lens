import pandas as pd
import pytest

from backend.app.core.errors import AppError
from backend.app.services.combined_analysis import (
    ValidatedSource,
    combine_validated_sales_data,
)
from backend.app.services.validator import REQUIRED_COLUMNS, validate_sales_data


def _validated(rows: list[list[object]]) -> pd.DataFrame:
    return validate_sales_data(
        pd.DataFrame(rows, columns=REQUIRED_COLUMNS),
        max_rows=50_000,
    )


def _row(
    *,
    order_id: str,
    customer_id: str = "C001",
    customer_name: str = "Customer One",
    product_id: str = "P001",
    product_name: str = "Product One",
    category: str = "Category",
    quantity: int = 1,
) -> list[object]:
    return [
        order_id,
        "2026-07-01",
        customer_id,
        customer_name,
        product_id,
        product_name,
        category,
        quantity,
        100_000,
        0,
        "completed",
    ]


def test_combines_disjoint_validated_files() -> None:
    result = combine_validated_sales_data(
        [
            ValidatedSource("january.csv", _validated([_row(order_id="A")])),
            ValidatedSource(
                "february.csv",
                _validated(
                    [
                        _row(
                            order_id="B",
                            customer_id="C002",
                            customer_name="Customer Two",
                        )
                    ]
                ),
            ),
        ],
        max_rows=50_000,
    )

    assert len(result.frame) == 2
    assert result.source_row_count == 2
    assert result.duplicate_order_count == 0
    assert result.warnings == []
    assert result.source_files == [
        {
            "file_name": "january.csv",
            "row_count": 1,
            "source_type": "marketlens",
            "source_row_count": 1,
            "skipped_row_count": 0,
        },
        {
            "file_name": "february.csv",
            "row_count": 1,
            "source_type": "marketlens",
            "source_row_count": 1,
            "skipped_row_count": 0,
        },
    ]


def test_removes_an_exact_order_repeated_in_another_file() -> None:
    order_rows = [
        _row(order_id="A"),
        _row(
            order_id="A",
            product_id="P002",
            product_name="Product Two",
        ),
    ]
    result = combine_validated_sales_data(
        [
            ValidatedSource("export-one.csv", _validated(order_rows)),
            ValidatedSource(
                "export-two.csv",
                _validated(list(reversed(order_rows))),
            ),
        ],
        max_rows=50_000,
    )

    assert len(result.frame) == 2
    assert result.source_row_count == 4
    assert result.duplicate_order_count == 1
    assert result.duplicate_row_count == 2
    assert result.warnings == ["DUPLICATE_ORDERS_REMOVED"]


def test_rejects_conflicting_versions_of_the_same_order() -> None:
    with pytest.raises(AppError) as caught:
        combine_validated_sales_data(
            [
                ValidatedSource(
                    "original.csv",
                    _validated([_row(order_id="A", quantity=1)]),
                ),
                ValidatedSource(
                    "changed.csv",
                    _validated([_row(order_id="A", quantity=2)]),
                ),
            ],
            max_rows=50_000,
        )

    assert caught.value.code == "CONFLICTING_DATA_ACROSS_FILES"
    assert caught.value.details["errors"][0] == {
        "column": "order_id",
        "reason": "conflicting_order_across_files",
        "identifier": "A",
        "files": ["changed.csv", "original.csv"],
    }


def test_rejects_cross_file_product_identity_conflict() -> None:
    with pytest.raises(AppError) as caught:
        combine_validated_sales_data(
            [
                ValidatedSource(
                    "one.csv",
                    _validated([_row(order_id="A", product_name="First name")]),
                ),
                ValidatedSource(
                    "two.csv",
                    _validated(
                        [
                            _row(
                                order_id="B",
                                customer_id="C002",
                                customer_name="Customer Two",
                                product_name="Different name",
                            )
                        ]
                    ),
                ),
            ],
            max_rows=50_000,
        )

    assert caught.value.code == "CONFLICTING_DATA_ACROSS_FILES"
    assert caught.value.details["errors"][0]["column"] == "product_name"
    assert caught.value.details["errors"][0]["identifier"] == "P001"


def test_combined_row_limit_applies_to_all_source_files() -> None:
    with pytest.raises(AppError) as caught:
        combine_validated_sales_data(
            [
                ValidatedSource("one.csv", _validated([_row(order_id="A")])),
                ValidatedSource(
                    "two.csv",
                    _validated(
                        [
                            _row(
                                order_id="B",
                                customer_id="C002",
                                customer_name="Customer Two",
                            )
                        ]
                    ),
                ),
            ],
            max_rows=1,
        )

    assert caught.value.code == "TOO_MANY_ROWS"
    assert caught.value.details["actual_rows"] == 2
