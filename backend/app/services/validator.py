from collections.abc import Iterable
from dataclasses import dataclass

import numpy as np
import pandas as pd

from backend.app.core.errors import AppError


REQUIRED_COLUMNS = [
    "order_id",
    "order_date",
    "customer_id",
    "customer_name",
    "product_id",
    "product_name",
    "category",
    "quantity",
    "unit_price",
    "discount",
    "order_status",
]
STRING_COLUMNS = [
    "order_id",
    "customer_id",
    "customer_name",
    "product_id",
    "product_name",
    "category",
    "order_status",
]
VALID_STATUSES = {"completed", "cancelled", "returned"}
MAX_RETURNED_ERRORS = 20
DEFAULT_MAX_ANALYSIS_PERIOD_DAYS = 1_826


@dataclass(frozen=True)
class RowValidationError:
    row: int | None
    column: str
    reason: str
    identifier: str | None = None

    def to_dict(self) -> dict[str, int | str]:
        result: dict[str, int | str] = {
            "column": self.column,
            "reason": self.reason,
        }
        if self.row is not None:
            result["row"] = self.row
        if self.identifier is not None:
            result["identifier"] = self.identifier
        return result


def validate_sales_data(
    frame: pd.DataFrame,
    *,
    max_rows: int,
    max_period_days: int = DEFAULT_MAX_ANALYSIS_PERIOD_DAYS,
) -> pd.DataFrame:
    if len(frame.index) > max_rows:
        raise AppError(
            code="TOO_MANY_ROWS",
            message=f"The file exceeds the {max_rows:,}-row limit.",
            status_code=400,
            details={"max_rows": max_rows, "actual_rows": len(frame.index)},
        )

    normalized_columns = [str(column).strip().lower() for column in frame.columns]
    if (
        len(normalized_columns) != len(set(normalized_columns))
        or set(normalized_columns) != set(REQUIRED_COLUMNS)
        or len(normalized_columns) != len(REQUIRED_COLUMNS)
    ):
        missing = sorted(set(REQUIRED_COLUMNS) - set(normalized_columns))
        extra = sorted(set(normalized_columns) - set(REQUIRED_COLUMNS))
        duplicates = sorted(
            column
            for column in set(normalized_columns)
            if normalized_columns.count(column) > 1
        )
        raise AppError(
            code="INVALID_FILE_COLUMNS",
            message="The columns do not match the MarketLens template.",
            status_code=400,
            details={
                "required": REQUIRED_COLUMNS,
                "missing": missing,
                "extra": extra,
                "duplicates": duplicates,
            },
        )

    normalized = frame.copy()
    normalized.columns = normalized_columns
    normalized["_source_row"] = normalized.index.map(lambda index: int(index) + 2)
    normalized = normalized.dropna(how="all", subset=REQUIRED_COLUMNS).copy()

    if normalized.empty:
        raise AppError(
            code="EMPTY_FILE",
            message="The file does not contain any data rows.",
            status_code=400,
        )

    errors: list[RowValidationError] = []

    for column in STRING_COLUMNS:
        raw_values = normalized[column]
        missing_mask = raw_values.isna() | raw_values.astype(str).str.strip().eq("")
        _add_mask_errors(
            errors,
            normalized,
            missing_mask,
            column=column,
            reason="required",
        )
        normalized[column] = raw_values.fillna("").astype(str).str.strip()

    normalized["order_status"] = normalized["order_status"].str.lower()
    invalid_status_mask = ~normalized["order_status"].isin(VALID_STATUSES)
    _add_mask_errors(
        errors,
        normalized,
        invalid_status_mask,
        column="order_status",
        reason="invalid_status",
    )

    parsed_dates = pd.to_datetime(
        normalized["order_date"],
        format="%Y-%m-%d",
        errors="coerce",
    )
    _add_mask_errors(
        errors,
        normalized,
        parsed_dates.isna(),
        column="order_date",
        reason="invalid_date",
    )
    normalized["order_date"] = parsed_dates

    quantity = pd.to_numeric(normalized["quantity"], errors="coerce")
    max_quantity_per_row = max(
        1,
        int(np.iinfo(np.int64).max // max(max_rows, 1)),
    )
    invalid_quantity = (
        quantity.isna()
        | ~np.isfinite(quantity)
        | (quantity <= 0)
        | ((quantity.notna()) & (quantity % 1 != 0))
        | (quantity > max_quantity_per_row)
    )
    _add_mask_errors(
        errors,
        normalized,
        invalid_quantity,
        column="quantity",
        reason="must_be_positive_integer",
    )
    normalized["quantity"] = quantity

    for column in ("unit_price", "discount"):
        numeric = pd.to_numeric(normalized[column], errors="coerce")
        invalid_numeric = numeric.isna() | ~np.isfinite(numeric) | (numeric < 0)
        _add_mask_errors(
            errors,
            normalized,
            invalid_numeric,
            column=column,
            reason="must_be_non_negative_number",
        )
        normalized[column] = numeric

    max_monetary_value_per_row = (
        np.finfo(np.float64).max / max(max_rows, 1) / 4
    )
    with np.errstate(over="ignore", invalid="ignore"):
        gross_revenue = (
            normalized["quantity"] * normalized["unit_price"]
        )
        line_revenue = gross_revenue - normalized["discount"]
    invalid_gross_revenue = (
        ~np.isfinite(gross_revenue)
        | (gross_revenue > max_monetary_value_per_row)
    )
    _add_mask_errors(
        errors,
        normalized,
        invalid_gross_revenue,
        column="unit_price",
        reason="line_value_out_of_supported_range",
    )
    invalid_discount_range = (
        normalized["discount"] > max_monetary_value_per_row
    )
    _add_mask_errors(
        errors,
        normalized,
        invalid_discount_range,
        column="discount",
        reason="line_value_out_of_supported_range",
    )
    invalid_line_revenue = (
        (
            ~np.isfinite(line_revenue)
            | (line_revenue > max_monetary_value_per_row)
        )
        & ~invalid_gross_revenue
        & ~invalid_discount_range
    )
    _add_mask_errors(
        errors,
        normalized,
        invalid_line_revenue,
        column="unit_price",
        reason="line_value_out_of_supported_range",
    )
    _add_mask_errors(
        errors,
        normalized,
        line_revenue.notna() & (line_revenue < 0),
        column="discount",
        reason="line_revenue_must_be_non_negative",
    )
    normalized["line_revenue"] = line_revenue

    errors.extend(
        _consistency_errors(
            normalized,
            id_column="order_id",
            consistent_columns=("order_date", "customer_id", "order_status"),
        )
    )
    errors.extend(
        _consistency_errors(
            normalized,
            id_column="product_id",
            consistent_columns=("product_name", "category"),
        )
    )
    errors.extend(
        _consistency_errors(
            normalized,
            id_column="customer_id",
            consistent_columns=("customer_name",),
        )
    )

    if errors:
        _raise_row_errors(errors)

    validate_analysis_period(
        normalized,
        max_period_days=max_period_days,
    )
    normalized["quantity"] = normalized["quantity"].astype("int64")
    normalized = normalized.reset_index(drop=True)
    return normalized


def validate_analysis_period(
    frame: pd.DataFrame,
    *,
    max_period_days: int,
) -> None:
    date_from = pd.Timestamp(frame["order_date"].min()).normalize()
    date_to = pd.Timestamp(frame["order_date"].max()).normalize()
    actual_period_days = int((date_to - date_from).days) + 1
    if actual_period_days <= max_period_days:
        return

    raise AppError(
        code="DATE_RANGE_TOO_LARGE",
        message=(
            "The analysis period exceeds the "
            f"{max_period_days:,}-day limit."
        ),
        status_code=400,
        details={
            "max_period_days": max_period_days,
            "actual_period_days": actual_period_days,
            "date_from": date_from.date().isoformat(),
            "date_to": date_to.date().isoformat(),
        },
    )


def _add_mask_errors(
    errors: list[RowValidationError],
    frame: pd.DataFrame,
    mask: pd.Series,
    *,
    column: str,
    reason: str,
) -> None:
    for index in frame.index[mask.fillna(False)]:
        errors.append(
            RowValidationError(
                row=int(frame.at[index, "_source_row"]),
                column=column,
                reason=reason,
            )
        )


def _consistency_errors(
    frame: pd.DataFrame,
    *,
    id_column: str,
    consistent_columns: Iterable[str],
) -> list[RowValidationError]:
    errors: list[RowValidationError] = []
    valid_identifiers = frame[id_column].astype(str).str.strip().ne("")
    subset = frame.loc[valid_identifiers]

    for column in consistent_columns:
        counts = subset.groupby(id_column, dropna=False)[column].nunique(dropna=False)
        for identifier in counts[counts > 1].index:
            errors.append(
                RowValidationError(
                    row=None,
                    column=column,
                    reason=f"inconsistent_for_{id_column}",
                    identifier=str(identifier),
                )
            )

    return errors


def _raise_row_errors(errors: list[RowValidationError]) -> None:
    sorted_errors = sorted(
        errors,
        key=lambda error: (
            error.row is None,
            error.row or 0,
            error.column,
            error.identifier or "",
        ),
    )
    raise AppError(
        code="INVALID_ROW_DATA",
        message="The file contains invalid data.",
        status_code=400,
        details={
            "errors": [
                error.to_dict()
                for error in sorted_errors[:MAX_RETURNED_ERRORS]
            ],
            "total_error_count": len(sorted_errors),
        },
    )
