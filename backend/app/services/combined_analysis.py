from dataclasses import dataclass
from typing import Any

import pandas as pd

from backend.app.core.errors import AppError
from backend.app.schemas.imports import ImportCapabilities
from backend.app.services.validator import MAX_RETURNED_ERRORS, REQUIRED_COLUMNS


@dataclass(frozen=True)
class ValidatedSource:
    file_name: str
    frame: pd.DataFrame
    source_type: str = "marketlens"
    source_row_count: int | None = None
    skipped_row_count: int = 0
    header_fingerprint: str | None = None
    capabilities: ImportCapabilities | None = None


@dataclass(frozen=True)
class CombinedSalesData:
    frame: pd.DataFrame
    source_files: list[dict[str, Any]]
    source_row_count: int
    duplicate_order_count: int
    duplicate_row_count: int
    warnings: list[str]
    skipped_row_count: int
    source_type: str
    header_fingerprint: str | None
    capabilities: ImportCapabilities


def combine_validated_sales_data(
    sources: list[ValidatedSource],
    *,
    max_rows: int,
) -> CombinedSalesData:
    if len(sources) < 2:
        raise AppError(
            code="NOT_ENOUGH_FILES",
            message="Select at least two files for a combined analysis.",
            status_code=400,
            details={"minimum_files": 2},
        )

    source_row_count = sum(
        source.source_row_count
        if source.source_row_count is not None
        else len(source.frame.index)
        for source in sources
    )
    if source_row_count > max_rows:
        raise AppError(
            code="TOO_MANY_ROWS",
            message=(
                f"The selected files exceed the combined {max_rows:,}-row "
                "limit."
            ),
            status_code=400,
            details={
                "max_rows": max_rows,
                "actual_rows": source_row_count,
                "file_count": len(sources),
            },
        )

    source_files = [
        {
            "file_name": source.file_name,
            "row_count": len(source.frame.index),
            "source_type": source.source_type,
            "source_row_count": (
                source.source_row_count
                if source.source_row_count is not None
                else len(source.frame.index)
            ),
            "skipped_row_count": source.skipped_row_count,
        }
        for source in sources
    ]
    marked_frames: list[pd.DataFrame] = []
    for source_index, source in enumerate(sources):
        marked = source.frame.copy()
        marked["_source_file"] = source.file_name
        marked["_source_index"] = source_index
        marked_frames.append(marked)

    combined = pd.concat(marked_frames, ignore_index=True)
    duplicate_order_ids, order_conflicts = _find_cross_file_order_duplicates(
        combined
    )
    consistency_conflicts = _find_cross_file_consistency_conflicts(combined)
    conflicts = [*order_conflicts, *consistency_conflicts]
    if conflicts:
        raise AppError(
            code="CONFLICTING_DATA_ACROSS_FILES",
            message="The selected files contain conflicting shared identifiers.",
            status_code=400,
            details={
                "errors": conflicts[:MAX_RETURNED_ERRORS],
                "total_error_count": len(conflicts),
            },
        )

    duplicate_row_count = 0
    if duplicate_order_ids:
        keep_mask = pd.Series(True, index=combined.index)
        for order_id in duplicate_order_ids:
            order_rows = combined.loc[combined["order_id"] == order_id]
            first_source_index = int(order_rows["_source_index"].min())
            duplicate_rows = order_rows[
                order_rows["_source_index"] != first_source_index
            ].index
            duplicate_row_count += len(duplicate_rows)
            keep_mask.loc[duplicate_rows] = False
        combined = combined.loc[keep_mask].copy()

    cleaned = combined.drop(
        columns=["_source_file", "_source_index"],
        errors="ignore",
    ).reset_index(drop=True)
    warnings = (
        ["DUPLICATE_ORDERS_REMOVED"] if duplicate_order_ids else []
    )
    capabilities = _combined_capabilities(sources)
    source_types = {source.source_type for source in sources}
    fingerprints = {
        source.header_fingerprint
        for source in sources
        if source.header_fingerprint
    }
    return CombinedSalesData(
        frame=cleaned,
        source_files=source_files,
        source_row_count=source_row_count,
        duplicate_order_count=len(duplicate_order_ids),
        duplicate_row_count=duplicate_row_count,
        warnings=warnings,
        skipped_row_count=sum(source.skipped_row_count for source in sources),
        source_type=(
            next(iter(source_types))
            if len(source_types) == 1
            else "mixed"
        ),
        header_fingerprint=(
            next(iter(fingerprints))
            if len(fingerprints) == 1
            else None
        ),
        capabilities=capabilities,
    )


def _combined_capabilities(
    sources: list[ValidatedSource],
) -> ImportCapabilities:
    capabilities = [
        source.capabilities
        for source in sources
        if source.capabilities is not None
    ]
    if not capabilities:
        return ImportCapabilities(
            sales_analytics=True,
            product_analytics=True,
            customer_analytics=True,
            category_analytics=True,
            discount_analytics=True,
            cancellation_return_analysis=True,
        )
    fields = ImportCapabilities.model_fields
    return ImportCapabilities(
        **{
            field: all(
                bool(getattr(capability, field))
                for capability in capabilities
            )
            for field in fields
        }
    )


def _find_cross_file_order_duplicates(
    frame: pd.DataFrame,
) -> tuple[list[str], list[dict[str, Any]]]:
    duplicate_order_ids: list[str] = []
    conflicts: list[dict[str, Any]] = []
    source_counts = frame.groupby("order_id")["_source_file"].nunique()

    repeated_order_ids = source_counts[source_counts > 1].index
    for order_id in sorted(str(value) for value in repeated_order_ids):
        order_rows = frame.loc[frame["order_id"] == order_id]
        source_names = sorted(order_rows["_source_file"].astype(str).unique())
        signatures = [
            _canonical_order_signature(
                order_rows.loc[order_rows["_source_file"] == source_name]
            )
            for source_name in source_names
        ]
        if all(signature == signatures[0] for signature in signatures[1:]):
            duplicate_order_ids.append(order_id)
            continue
        conflicts.append(
            {
                "column": "order_id",
                "reason": "conflicting_order_across_files",
                "identifier": order_id,
                "files": source_names,
            }
        )

    return duplicate_order_ids, conflicts


def _canonical_order_signature(frame: pd.DataFrame) -> tuple[tuple[str, ...], ...]:
    signature_rows: list[tuple[str, ...]] = []
    for row in frame[REQUIRED_COLUMNS].itertuples(index=False, name=None):
        signature_rows.append(tuple(_canonical_value(value) for value in row))
    return tuple(sorted(signature_rows))


def _canonical_value(value: Any) -> str:
    if isinstance(value, pd.Timestamp):
        return value.strftime("%Y-%m-%d")
    if pd.isna(value):
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def _find_cross_file_consistency_conflicts(
    frame: pd.DataFrame,
) -> list[dict[str, Any]]:
    rules = (
        ("product_id", "product_name"),
        ("product_id", "category"),
        ("customer_id", "customer_name"),
    )
    conflicts: list[dict[str, Any]] = []
    for identifier_column, value_column in rules:
        for identifier, group in frame.groupby(identifier_column, sort=True):
            if group["_source_file"].nunique() < 2:
                continue
            if group[value_column].nunique(dropna=False) <= 1:
                continue
            conflicts.append(
                {
                    "column": value_column,
                    "reason": f"inconsistent_for_{identifier_column}",
                    "identifier": str(identifier),
                    "files": sorted(
                        group["_source_file"].astype(str).unique().tolist()
                    ),
                }
            )
    return conflicts
